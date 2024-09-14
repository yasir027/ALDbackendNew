import express from 'express';
import { Sequelize, DataTypes, Op } from 'sequelize';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { Client } from '@elastic/elasticsearch';

import mysql from 'mysql2/promise';

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

const sequelize = new Sequelize('sys', 'root', 'aldonline123', {
  host: 'localhost',
  dialect: 'mysql',
});

const pool = mysql.createPool({
  connectionLimit: 10,
  host: "localhost",
  user: "root",
  password: "aldonline123",
  database: "sys",
});





const client = new Client({
    node: 'http://localhost:9200',
    auth: {
      username: 'elastic', // Your Elasticsearch username
      password: 'aldonline123' // Your Elasticsearch password
    }
  });

  async function deleteIndexIfExists() {
    const indexExists = await client.indices.exists({ index: 'jud' });

    if (indexExists.body) {
      await client.indices.delete({ index: 'jud' });
      console.log('Deleted existing index: jud');
    }
  }

  async function createIndexWithMapping() {
    await client.indices.create({
      index: 'jud',
      body: {
        mappings: {
          properties: {
            judgmentId: { type: 'integer' },
            judgmentDOJ: { type: 'text' },
            judgmentParties: { type: 'text' },
            judgmentCitation: { type: 'text' },
            courtName: { type: 'text' },
            judgementTextParaText: { type: 'text' },
            shortNoteText: { type: 'text' },
            longNoteParaText: { type: 'text' },
            shortNoteParaText: { type: 'text' }
          }
        }
      }
    });
    console.log('Index created with mapping: jud');
  }

  async function bulkIndexData(bulkData) {
    try {
      const bulkResponse = await client.bulk({ body: bulkData });
      if (bulkResponse.errors) {
        console.error('Bulk indexing had errors:', bulkResponse.errors);
      } else {
        console.log('Bulk indexing successful');
      }
    } catch (error) {
      console.error('Error in bulk indexing:', error);
    }
  }

  async function indexData() {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'aldonline123',
      database: 'sys'
    });

    await deleteIndexIfExists();
    await createIndexWithMapping();

    const [judgmentTextParas] = await connection.execute(
      `SELECT jtp.*, jt.judgmentId, j.judgmentDOJ, j.judgmentParties, j.judgmentCitation, c.courtName
       FROM judgementtextpara jtp
       JOIN judgementtext jt ON jtp.judgementTextId = jt.judgementTextId
       JOIN judgment j ON jt.judgmentId = j.judgmentId
       JOIN court c ON j.courtId = c.courtId`
    );

    const [shortNotes] = await connection.execute(
      `SELECT sn.*, j.judgmentDOJ, j.judgmentParties, j.judgmentCitation, c.courtName
       FROM shortnote sn
       JOIN judgment j ON sn.judgmentId = j.judgmentId
       JOIN court c ON j.courtId = c.courtId`
    );

    const [longNoteParas] = await connection.execute(
      `SELECT lnp.*, sn.judgmentId, j.judgmentDOJ, j.judgmentParties, j.judgmentCitation, c.courtName
       FROM longnotepara lnp
       JOIN longnote ln ON lnp.longNoteParaId = ln.longNoteId
       JOIN shortnote sn ON ln.shortNoteId = sn.shortNoteId
       JOIN judgment j ON sn.judgmentId = j.judgmentId
       JOIN court c ON j.courtId = c.courtId`
    );

    const [shortNoteParas] = await connection.execute(
      `SELECT snp.*, j.judgmentId, j.judgmentDOJ, j.judgmentParties, j.judgmentCitation, c.courtName
       FROM shortnotepara snp
       JOIN shortnote sn ON snp.shortNoteId = sn.shortNoteId
       JOIN judgment j ON sn.judgmentId = j.judgmentId
       JOIN court c ON j.courtId = c.courtId`
    );

    console.log(`Fetched ${judgmentTextParas.length} judgment text paras`);
    console.log(`Fetched ${shortNotes.length} short notes`);
    console.log(`Fetched ${longNoteParas.length} long note paras`);
    console.log(`Fetched ${shortNoteParas.length} short note paras`);

    const bulkSize = 3000;
    const bulkData = [];

    for (const para of judgmentTextParas) {
      if (!para.judgmentId) {
        console.warn(`Missing judgmentId for judgementTextParaId: ${para.judgementTextParaId}`);
        continue;
      }
      bulkData.push({ index: { _index: 'jud', _id: `judgementtextpara-${para.judgementTextParaId}` } });
      bulkData.push({
        judgmentId: para.judgmentId,
        judgmentDOJ: para.judgmentDOJ,
        judgmentParties: para.judgmentParties,
        judgmentCitation: para.judgmentCitation,
        courtName: para.courtName,
        judgementTextParaText: para.judgementTextParaText
      });
      if (bulkData.length >= bulkSize * 2) {
        await bulkIndexData(bulkData);
        bulkData.length = 0;
      }
    }

    for (const note of shortNotes) {
      if (!note.judgmentId) {
        console.warn(`Missing judgmentId for shortNoteId: ${note.shortNoteId}`);
        continue;
      }
      bulkData.push({ index: { _index: 'jud', _id: `shortnote-${note.shortNoteId}` } });
      bulkData.push({
        judgmentId: note.judgmentId,
        judgmentDOJ: note.judgmentDOJ,
        judgmentParties: note.judgmentParties,
        judgmentCitation: note.judgmentCitation,
        courtName: note.courtName,
        shortNoteText: note.shortNoteText
      });
      if (bulkData.length >= bulkSize * 2) {
        await bulkIndexData(bulkData);
        bulkData.length = 0;
      }
    }

    for (const para of longNoteParas) {
      if (!para.judgmentId) {
        console.warn(`Missing judgmentId for longNoteParaId: ${para.longNoteParaId}`);
        continue;
      }
      bulkData.push({ index: { _index: 'jud', _id: `longnotepara-${para.longNoteParaId}` } });
      bulkData.push({
        judgmentId: para.judgmentId,
        judgmentDOJ: para.judgmentDOJ,
        judgmentParties: para.judgmentParties,
        judgmentCitation: para.judgmentCitation,
        courtName: para.courtName,
        longNoteParaText: para.longNoteParaText
      });
      if (bulkData.length >= bulkSize * 2) {
        await bulkIndexData(bulkData);
        bulkData.length = 0;
      }
    }

    for (const para of shortNoteParas) {
      if (!para.judgmentId) {
        console.warn(`Missing judgmentId for shortNoteParaId: ${para.shortNoteParaId}`);
        continue;
      }
      bulkData.push({ index: { _index: 'jud', _id: `shortnotepara-${para.shortNoteParaId}` } });
      bulkData.push({
        judgmentId: para.judgmentId,
        judgmentDOJ: para.judgmentDOJ,
        judgmentParties: para.judgmentParties,
        judgmentCitation: para.judgmentCitation,
        courtName: para.courtName,
        shortNoteParaText: para.shortNoteParaText
      });
      if (bulkData.length >= bulkSize * 2) {
        await bulkIndexData(bulkData);
        bulkData.length = 0;
      }
    }

    if (bulkData.length > 0) {
      await bulkIndexData(bulkData);
    }

    await client.indices.refresh({ index: 'jud' });
    connection.end();
    console.log('Data indexed');
  }

  indexData().catch(console.log);


  app.post('/api/freeword-search', async (req, res) => {
      const { searchWords } = req.body;

      if (!searchWords || searchWords.length === 0) {
          return res.status(400).json({ error: 'At least one search word is required' });
      }

      try {
          const mustQueries = searchWords.map(word => ({
              bool: {
                  should: [
                      { match: { 'judgementTextParaText': word } },
                      { match: { 'shortNoteText': word } },
                      { match: { 'longNoteParaText': word } },
                      { match: { 'shortNoteParaText': word } }
                  ]
              }
          }));

          const result = await client.search({
              index: 'jud',
              body: {
                  query: {
                      bool: {
                          must: mustQueries
                      }
                  },
                  _source: ['judgmentId', 'judgmentDOJ', 'judgmentParties', 'judgmentCitation', 'courtName'],
                  size: 20000
              }
          });

          console.log('Elasticsearch search result:', result.hits.hits);

          // Filter out duplicates based on judgmentId
          const uniqueHits = [];
          const seenJudgmentIds = new Set();

          for (const hit of result.hits.hits) {
              const judgmentId = hit._source.judgmentId;
              if (!seenJudgmentIds.has(judgmentId)) {
                  seenJudgmentIds.add(judgmentId);
                  uniqueHits.push({
                      judgmentId,
                      judgmentDOJ: hit._source.judgmentDOJ,
                      judgmentParties: hit._source.judgmentParties,
                      judgmentCitation: hit._source.judgmentCitation,
                      courtName: hit._source.courtName
                  });
              }
          }

          res.json(uniqueHits);
      } catch (error) {
          console.error('Error performing freeword search:', error);
          res.status(500).json({ error: 'Internal Server Error' });
      }
  });

app.get('/api/searchAdvanced', async (req, res) => {
  const acts = Array.isArray(req.query.acts) ? req.query.acts : req.query.acts ? [req.query.acts] : [];
  const sections = Array.isArray(req.query.sections) ? req.query.sections : req.query.sections ? [req.query.sections] : [];
  const subsections = Array.isArray(req.query.subsections) ? req.query.subsections : req.query.subsections ? [req.query.subsections] : [];
  const topics = Array.isArray(req.query.topics) ? req.query.topics : req.query.topics ? [req.query.topics] : [];
  const judges = Array.isArray(req.query.judges) ? req.query.judges : req.query.judges ? [req.query.judges] : [];
  const advocates = Array.isArray(req.query.advocates) ? req.query.advocates : req.query.advocates ? [req.query.advocates] : [];
  const queryText = req.query.queryText || ''; // Free word search

  if (acts.length === 0 && sections.length === 0 && subsections.length === 0 && topics.length === 0 && judges.length === 0 && advocates.length === 0 && !queryText) {
      return res.status(400).json({ error: 'At least one search parameter is required' });
  }

  try {
    const results = await getJudgmentsByMultipleCriteria(acts, sections, subsections, topics, judges, advocates, queryText);
    res.json(results);
  } catch (error) {
    console.error('Error executing advanced search:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export async function getJudgmentsByMultipleCriteria(actKeywords, sectionKeywords, subsectionKeywords, topicKeywords, judgeKeywords, advocateKeywords) {
  let connection;
  try {
      connection = await pool.getConnection();

      let query = `
          SELECT DISTINCT
              j.judgmentId,
              j.judgmentCitation,
              j.judgmentParties,
              a.advocateName,
              j.judgmentDOJ,
              c.courtName,
              l.legislationName,
              CONCAT(ls.legislationSectionPrefix, ' ', ls.legislationSectionNo) AS legislationSectionCombined,
              ls.legislationSectionName,
              lss.legislationSubSectionName
          FROM 
              judgment j
              LEFT JOIN court c ON j.courtId = c.courtId
              LEFT JOIN shortnote sn ON j.judgmentId = sn.judgmentId
              LEFT JOIN shortnoteleg snl ON sn.shortNoteId = snl.shortNoteId
              LEFT JOIN legislation l ON snl.legislationId = l.legislationId
              LEFT JOIN shortnotelegsec snls ON sn.shortNoteId = snls.shortNoteId
              LEFT JOIN legislationsection ls ON snls.legislationSectionId = ls.legislationSectionId
              LEFT JOIN shortnotelegsubsec snlss ON sn.shortNoteId = snlss.shortNoteId
              LEFT JOIN legislationsubsection lss ON snlss.legislationSubSectionId = lss.legislationSubSectionId
              LEFT JOIN judgmenttopics jt ON j.judgmentId = jt.judgmentId
              LEFT JOIN topic t ON jt.topicId = t.topicId
              LEFT JOIN judgmentjudges jj ON j.judgmentId = jj.judgmentId
              LEFT JOIN judge ju ON jj.judgeId = ju.judgeId
              LEFT JOIN judgmentadvocates ja ON j.judgmentId = ja.judgmentId
              LEFT JOIN advocate a ON ja.advocateId = a.advocateId
          WHERE 
      `;

      const conditions = [];

      if (actKeywords.length > 0) {
          actKeywords.forEach(kw => {
              conditions.push(`
                  EXISTS (
                      SELECT 1 
                      FROM shortnote sn
                      JOIN shortnoteleg snl ON sn.shortNoteId = snl.shortNoteId
                      JOIN legislation l ON snl.legislationId = l.legislationId
                      WHERE sn.judgmentId = j.judgmentId 
                      AND l.legislationName LIKE ?
                  )
              `);
          });
      }

      if (sectionKeywords.length > 0) {
          sectionKeywords.forEach(kw => {
              conditions.push(`
                  EXISTS (
                      SELECT 1 
                      FROM shortnote sn
                      JOIN shortnotelegsec snls ON sn.shortNoteId = snls.shortNoteId
                      JOIN legislationsection ls ON snls.legislationSectionId = ls.legislationSectionId
                      WHERE sn.judgmentId = j.judgmentId 
                      AND CONCAT(ls.legislationSectionPrefix, ' ', ls.legislationSectionNo) LIKE ?
                  )
              `);
          });
      }

      if (subsectionKeywords.length > 0) {
          subsectionKeywords.forEach(kw => {
              conditions.push(`
                  EXISTS (
                      SELECT 1 
                      FROM shortnote sn
                      JOIN shortnotelegsubsec snlss ON sn.shortNoteId = snlss.shortNoteId
                      JOIN legislationsubsection lss ON snlss.legislationSubSectionId = lss.legislationSubSectionId
                      WHERE sn.judgmentId = j.judgmentId 
                      AND lss.legislationSubSectionName LIKE ?
                  )
              `);
          });
      }

      if (topicKeywords.length > 0) {
          topicKeywords.forEach(kw => {
              conditions.push(`
                  EXISTS (
                      SELECT 1 
                      FROM judgmenttopics jt
                      JOIN topic t ON jt.topicId = t.topicId
                      WHERE jt.judgmentId = j.judgmentId 
                      AND t.topicName LIKE ?
                  )
              `);
          });
      }

      if (judgeKeywords.length > 0) {
          judgeKeywords.forEach(kw => {
              conditions.push(`
                  EXISTS (
                      SELECT 1 
                      FROM judgmentjudges jj
                      JOIN judge ju ON jj.judgeId = ju.judgeId
                      WHERE jj.judgmentId = j.judgmentId 
                      AND ju.judgeName LIKE ?
                  )
              `);
          });
      }

      if (advocateKeywords.length > 0) {
          advocateKeywords.forEach(kw => {
              conditions.push(`
                  EXISTS (
                      SELECT 1 
                      FROM judgmentadvocates ja
                      JOIN advocate a ON ja.advocateId = a.advocateId
                      WHERE ja.judgmentId = j.judgmentId 
                      AND a.advocateName LIKE ?
                  )
              `);
          });
      }

      query += conditions.join(' AND ');

      query += `
          ORDER BY 
              j.judgmentCitation DESC
      `;

      const queryParams = [
          ...actKeywords.map(kw => `%${kw}%`),
          ...sectionKeywords.map(kw => `%${kw}%`),
          ...subsectionKeywords.map(kw => `%${kw}%`),
          ...topicKeywords.map(kw => `%${kw}%`),
          ...judgeKeywords.map(kw => `%${kw}%`),
          ...advocateKeywords.map(kw => `%${kw}%`)
      ];

      const [rows] = await connection.execute(query, queryParams);
      return rows;
  } catch (error) {
      console.error('Error executing query:', error);
      throw error;
  } finally {
      if (connection) {
          connection.release();
      }
  }
}

// Define existing models
const Judgment = sequelize.define('Judgment', {
  judgmentId: { type: DataTypes.INTEGER, primaryKey: true },
  judgmentCitation: DataTypes.STRING,
  judgmentNo: DataTypes.STRING,
  judgmentYear: DataTypes.STRING,
  judgmentNoText: DataTypes.TEXT,
  judgmentDOJ: DataTypes.STRING,
  judgmentType: DataTypes.STRING,
  judgmentPetitioner: DataTypes.TEXT,
  judgmentRespondent: DataTypes.TEXT,
  judgmentParties: DataTypes.TEXT,
  courtId: DataTypes.INTEGER,
  judgmentCourtText: DataTypes.TEXT,
  judgmentPetitionerCouncil: DataTypes.TEXT,
  judgmentRespondentCouncil: DataTypes.TEXT,
  judgmentOtherCounsel: DataTypes.TEXT,
  operatorId: DataTypes.INTEGER,
  judgmentEntryDate: DataTypes.STRING,
  judgmentJudges: DataTypes.STRING,
  judgmentDocFile: DataTypes.STRING,
  judgmentJudicialObservation: DataTypes.TEXT,
}, {
  tableName: 'judgment',
  timestamps: false,
});


//newcitationsrialno
const CitationSerialNo = sequelize.define('CitationSerialNo', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  judgmentCitation: {
    type: DataTypes.STRING(100)
  },
  serialNumber: {
    type: DataTypes.INTEGER
  },
  citationYear: {
    type: DataTypes.INTEGER
  }
}, {
  tableName: 'citationserialno'
});


const JudgmentText = sequelize.define('JudgmentText', {
  judgementTextId: { type: DataTypes.INTEGER, primaryKey: true },
  judgmentId: { type: DataTypes.INTEGER, references: { model: Judgment, key: 'judgmentId' } },
  judgementTextHTML: DataTypes.TEXT,
  judgementTextDeliveredBy: DataTypes.TEXT,
  judgementTextResult: DataTypes.TEXT,
  judgementTextNo: DataTypes.INTEGER,
}, {
  tableName: 'judgementtext',
  timestamps: false,
});

const JudgmentTextPara = sequelize.define('JudgmentTextPara', {
  judgementTextParaId: { type: DataTypes.INTEGER, primaryKey: true },
  judgementTextId: { type: DataTypes.INTEGER, references: { model: JudgmentText, key: 'judgementTextId' } },
  judgementTextParaNo: DataTypes.STRING,
  judgementTextParaText: DataTypes.TEXT,
  judgementTextParaType: DataTypes.STRING,
}, {
  tableName: 'judgementtextpara',
  timestamps: false,
});

// Define new models with new table names and relationships
const ShortNote = sequelize.define('ShortNote', {
  shortNoteId: { type: DataTypes.INTEGER, primaryKey: true },
  judgmentId: { type: DataTypes.INTEGER, references: { model: Judgment, key: 'judgmentId' } },
  shortNoteText: DataTypes.TEXT,
}, {
  tableName: 'shortnote',
  timestamps: false,
});

const ShortNotePara = sequelize.define('ShortNotePara', {
  shortNoteParaId: { type: DataTypes.INTEGER, primaryKey: true },
  shortNoteId: { type: DataTypes.INTEGER, references: { model: ShortNote, key: 'shortNoteId' } },
  shortNoteParaText: DataTypes.TEXT, 
  shortNoteParaLink: DataTypes.TEXT, 
  shortNoteParaJudgmentNo: DataTypes.INTEGER, 
}, {
  tableName: 'shortnotepara',
  timestamps: false,
});

const LongNote = sequelize.define('LongNote', {
  longNoteId: { type: DataTypes.INTEGER, primaryKey: true },
  shortNoteId: { type: DataTypes.INTEGER, references: { model: ShortNote, key: 'shortNoteId' } },
  longNoteText: DataTypes.TEXT,
}, {
  tableName: 'longnote',
  timestamps: false,
});


const LongNotePara = sequelize.define('LongNotePara', {
  longNoteParaId: { type: DataTypes.INTEGER, primaryKey: true },
  longNoteId: { type: DataTypes.INTEGER, references: { model: LongNote, key: 'longNoteId' } },
  longNoteParaText: DataTypes.TEXT,
  longNoteParaLink: DataTypes.STRING // Define the new column `longNoteParaLink`

}, {
  tableName: 'longnotepara',
  timestamps: false,
});

const judgmentsCited = sequelize.define('judgmentsCited', {
  judgmentsCitedId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  judgementTextId: { type: DataTypes.INTEGER, references: { model: JudgmentText, key: 'judgementTextId' } },
  judgmentsCitedParties: { type: DataTypes.STRING, allowNull: true },
  judgmentsCitedRefferedCitation: { type: DataTypes.TEXT, allowNull: true }, // Make sure this spelling is correct
  judgmentsCitedEqualCitation: { type: DataTypes.TEXT, allowNull: true },
  judgmentsCitedParaLink: { type: DataTypes.TEXT, allowNull: true },
  judgmentsCitedText: { type: DataTypes.TEXT, allowNull: true }
}, {
  tableName: 'judgmentscited',
  timestamps: false
});


const Topic = sequelize.define('Topic', {
  topicId: { type: DataTypes.INTEGER, primaryKey: true },
  topicName: { type: DataTypes.STRING(300) },
}, {
  tableName: 'topic',
  timestamps: false,
});

const Orders = sequelize.define('Orders', {
  ordersId: { type: DataTypes.INTEGER, primaryKey: true },
  ordersName: { type: DataTypes.STRING(200) },
  ordersCitation: { type: DataTypes.STRING(20) },
  ordersDateTime: { type: DataTypes.STRING(20) },
  ordersFile: { type: DataTypes.STRING(200) },
  ordersAuthor: { type: DataTypes.STRING(100) },
}, {
  tableName: 'orders',
  timestamps: false,
});


const JudgmentTopics = sequelize.define('JudgmentTopics', {
  judgmentTopicsId: { type: DataTypes.INTEGER, primaryKey: true },
  judgmentId: { type: DataTypes.INTEGER, references: { model: Judgment, key: 'judgmentId' } },
  topicId: { type: DataTypes.INTEGER, references: { model: Topic, key: 'topicId' } },
}, {
  tableName: 'judgmenttopics',
  timestamps: false,
});


const JudgmentStatusType = sequelize.define('JudgmentStatusType', {
  judgmentStatusTypeId: { type: DataTypes.INTEGER, primaryKey: true },
  judgmentStatusTypeName: { type: DataTypes.STRING(200) },
  judgmentStatusTypeText: { type: DataTypes.TEXT },
}, {
  tableName: 'judgmentstatustype',
  timestamps: false,
});


const JudgmentStatus = sequelize.define('JudgmentStatus', {
  judgmentStatusId: { type: DataTypes.INTEGER, primaryKey: true },
  judgmentStatusTypeId: { type: DataTypes.INTEGER, references: { model: JudgmentStatusType, key: 'judgmentStatusTypeId' } },
  judgmentId: { type: DataTypes.INTEGER, references: { model: Judgment, key: 'judgmentId' } },
  judgmentStatusALDCitation: { type: DataTypes.STRING(200) },
  judgmentStatusLinkCitation: { type: DataTypes.STRING(200) },
  judgmentStatusLeftRight: { type: DataTypes.STRING }, // Assuming it's a string, you can adjust the type as needed
}, {
  tableName: 'judgmentstatus',
  timestamps: false,
});




const JudgmentCaseNos = sequelize.define('JudgmentCaseNos', {
  judgmentCaseNosId: { type: DataTypes.INTEGER, primaryKey: true },
  judgmentId: { type: DataTypes.INTEGER, references: { model: Judgment, key: 'judgmentId' } },
  judgmentCaseNo: { type: DataTypes.STRING(100) },
  judgmentCaseYear: { type: DataTypes.STRING(10) },
}, {
  tableName: 'judgmentcasenos',
  timestamps: false,
});


const Judge = sequelize.define('Judge', {
  judgeId: { type: DataTypes.INTEGER, primaryKey: true },
  judgeName: { type: DataTypes.STRING(200) },
}, {
  tableName: 'judge',
  timestamps: false,
});


const CourtType = sequelize.define('CourtType', {
  courtTypeId: { type: DataTypes.INTEGER, primaryKey: true },
  courtTypeName: { type: DataTypes.STRING(200) },
  courtTypeDesc: { type: DataTypes.TEXT },
}, {
  tableName: 'courttype',
  timestamps: false,
});


const Court = sequelize.define('Court', {
  courtId: { type: DataTypes.INTEGER, primaryKey: true },
  courtTypeId: { type: DataTypes.INTEGER, references: { model: CourtType, key: 'courtTypeId' } },
  courtName: { type: DataTypes.STRING(200) },
  courtShortName: { type: DataTypes.STRING(20) },
}, {
  tableName: 'court',
  timestamps: false,
});




const Citation = sequelize.define('Citation', {
  citationId: { type: DataTypes.INTEGER, primaryKey: true },
  judgmentId: { type: DataTypes.INTEGER, references: { model: Judgment, key: 'judgmentId' } },
  publicationYearId: { type: DataTypes.INTEGER },
  courtId: { type: DataTypes.INTEGER, references: { model: Court, key: 'courtId' } },
  citationText: { type: DataTypes.STRING(200) },
  publicationVolume: { type: DataTypes.STRING(100) },
  publicationPart: { type: DataTypes.STRING(100) },
  citationCourtName: { type: DataTypes.STRING(200) },
  citationPageNo: { type: DataTypes.INTEGER },
  citationBench: { type: DataTypes.STRING(10) },
}, {
  tableName: 'citation',
  timestamps: false,
});

const EqualCitation = sequelize.define('EqualCitation', {
    equalCitationId: { type: DataTypes.INTEGER, primaryKey: true },
    judgmentId: { type: DataTypes.INTEGER, references: { model: Judgment, key: 'judgmentId' } },
    equalCitationText: { type: DataTypes.STRING(300) },
  }, {
    tableName: 'equalcitation',
    timestamps: false,
  });
  const PublicationYear = sequelize.define('publicationyear', {
    publicationYearId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    publicationId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    publicationYearNo: {
      type: DataTypes.STRING(20),
      allowNull: false
    }
  }, {
    // Additional model options
    tableName: 'publicationyear', // Set the table name explicitly
    timestamps: false // Disable timestamps
  });





// Define associations
Judgment.hasMany(JudgmentText, { foreignKey: 'judgmentId' });
JudgmentText.belongsTo(Judgment, { foreignKey: 'judgmentId' });


JudgmentText.hasMany(JudgmentTextPara, { foreignKey: 'judgementTextId' });
JudgmentTextPara.belongsTo(JudgmentText, { foreignKey: 'judgementTextId' });

JudgmentText.hasMany(judgmentsCited, { foreignKey: 'judgementTextId' });
judgmentsCited.belongsTo(JudgmentText, { foreignKey: 'judgementTextId' });


Judgment.hasMany(ShortNote, { foreignKey: 'judgmentId' });
ShortNote.belongsTo(Judgment, { foreignKey: 'judgmentId' });


Judgment.hasMany(JudgmentTopics, { foreignKey: 'judgmentId' });
JudgmentTopics.belongsTo(Judgment, { foreignKey: 'judgmentId' });

Judgment.hasMany(Court, { foreignKey: 'judgmentId' });
Court.belongsTo(Judgment, { foreignKey: 'judgmentId' });

Judgment.hasMany(JudgmentStatus, { foreignKey: 'judgmentId' });
JudgmentStatus.belongsTo(Judgment, { foreignKey: 'judgmentId' });

Judgment.hasMany(JudgmentCaseNos, { foreignKey: 'judgmentId' });
JudgmentCaseNos.belongsTo(Judgment, { foreignKey: 'judgmentId' });

Judgment.hasMany(Citation, { foreignKey: 'judgmentId' });
Citation.belongsTo(Judgment, { foreignKey: 'judgmentId' });

//new citationserialno
Judgment.hasOne(CitationSerialNo, { foreignKey: 'judgmentCitation', sourceKey: 'judgmentCitation' });

ShortNote.hasMany(ShortNotePara, { foreignKey: 'shortNoteId' });
ShortNotePara.belongsTo(ShortNote, { foreignKey: 'shortNoteId' });

ShortNote.hasMany(LongNote, { foreignKey: 'shortNoteId' });
LongNote.belongsTo(ShortNote, { foreignKey: 'shortNoteId' });

LongNote.hasMany(LongNotePara, { foreignKey: 'longNoteId' });
LongNotePara.belongsTo(LongNote, { foreignKey: 'longNoteId' });


Topic.hasMany(JudgmentTopics, { foreignKey: 'topicId' });
JudgmentTopics.belongsTo(Topic, { foreignKey: 'topicId' });


// JudgmentStatusType and JudgmentStatus
JudgmentStatusType.hasMany(JudgmentStatus, { foreignKey: 'judgmentStatusTypeId' });
JudgmentStatus.belongsTo(JudgmentStatusType, { foreignKey: 'judgmentStatusTypeId' });

// Court and related tables
Court.hasMany(Citation, { foreignKey: 'courtId' });
Citation.belongsTo(Court, { foreignKey: 'courtId' });

CourtType.hasMany(Court, { foreignKey: 'courtTypeId' });
Court.belongsTo(CourtType, { foreignKey: 'courtTypeId' });

//Equals
Judgment.hasMany(EqualCitation, { foreignKey: 'judgmentId' });
EqualCitation.belongsTo(Judgment, { foreignKey: 'judgmentId' });


Citation.belongsTo(PublicationYear, { foreignKey: 'publicationYearId' });
PublicationYear.hasMany(Citation, { foreignKey: 'publicationYearId' });

// API endpoint for shortnote search
app.post('/judgments/search', async (req, res) => {
    const { searchTerm } = req.body;

    try {
      const judgments = await Judgment.findAll({
        include: [
          {
            model: ShortNote,
            where: {
              shortNoteText: {
                [Op.like]: `%${searchTerm}%`
              }
            },
            attributes: ['shortNoteText']
          }
        ],
        attributes: ['id', 'title'] // Modify as needed
      });

      if (!judgments.length) {
        return res.status(404).json({ error: 'No judgments found' });
      }

      console.log('Fetched search results:', JSON.stringify(judgments, null, 2));
      res.json(judgments);
    } catch (error) {
      console.error('Error searching judgments:', error);
      res.status(500).send('Internal Server Error');
    }
  });

  //affan
  // Handling GET requests to /api/search
app.get('/api/search', async (req, res) => {
  const { legislationName, section, subsection } = req.query; // Extracting query parameters
  try {
      // Calling the function to get search results based on legislationName, section, and subsection
      const results = await getSearchResults(legislationName, section, subsection);
      // Sending the results as JSON response
      res.json(results);
  } catch (error) {
      // Handling errors - logging and sending 500 Internal Server Error response
      console.error('Error fetching search results:', error);
      res.status(500).json({ error: 'Internal Server Error' });
  }
});

//affan
//fetching corresponding judgment data with legislation(SECTION)
export async function getSearchResults(legislationName, section, subsection) {
  let connection;
  try {
      connection = await pool.getConnection();
      const query = `
          SELECT 
              j.*,
              j.judgmentId,
              j.judgmentCitation,
              sn.shortNoteId,
              sn.shortNoteText,
              l.legislationId,
              l.legislationName,
              ls.legislationSectionId,
              CONCAT(ls.legislationSectionPrefix, ' ', ls.legislationSectionNo) AS legislationSectionCombined,
              ls.legislationSectionName,
              lss.legislationSubSectionId,
              lss.legislationSubSectionName,
              c.courtName
          FROM 
              judgment j
            left join 
              court c on j.courtId = c.courtId
          LEFT JOIN 
              shortnote sn ON j.judgmentId = sn.judgmentId
          LEFT JOIN 
              shortnoteleg snl ON sn.shortNoteId = snl.shortNoteId
          LEFT JOIN 
              legislation l ON snl.legislationId = l.legislationId
          LEFT JOIN 
              shortnotelegsec snls ON sn.shortNoteId = snls.shortNoteId
          LEFT JOIN 
              legislationsection ls ON snls.legislationSectionId = ls.legislationSectionId
          LEFT JOIN 
              shortnotelegsubsec snlss ON sn.shortNoteId = snlss.shortNoteId
          LEFT JOIN 
              legislationsubsection lss ON snlss.legislationSubSectionId = lss.legislationSubSectionId
          WHERE 
              (? IS NULL OR l.legislationName LIKE ?)
              AND (? IS NULL OR CONCAT(ls.legislationSectionPrefix, ' ', ls.legislationSectionNo) LIKE ?)
              AND (? IS NULL OR lss.legislationSubSectionName LIKE ?)
            ORDER BY 
              j.judgmentCitation DESC
      `;

      const queryParams = [
          legislationName ? `%${legislationName}%` : null,
          legislationName ? `%${legislationName}%` : null,
          section ? `%${section}%` : null,
          section ? `%${section}%` : null,
          subsection ? `%${subsection}%` : null,
          subsection ? `%${subsection}%` : null
      ];

      const [rows] = await connection.execute(query, queryParams);
      return rows;
  } catch (error) {
      console.error('Error executing query:', error);
      throw error;
  } finally {
      if (connection) {
          connection.release();
      }
  }
}


app.get('/judgments/:judgmentId', async (req, res) => {
  const { judgmentId } = req.params;

  try {
    // Fetch the current judgment with its details
    const judgment = await Judgment.findByPk(judgmentId, {
      include: [
        {
          model: CitationSerialNo,
          attributes: ['serialNumber'],
          required: true
        },
        {
          model: JudgmentText,
          include: [
            {
              model: JudgmentTextPara,
              attributes: ['judgementTextParaText', 'judgementTextParaNo']
            },
            {
              model: judgmentsCited, // Ensure this model is correctly referenced
            attributes: ['judgmentsCitedRefferedCitation', 'judgmentsCitedParties', 'judgmentsCitedEqualCitation', 'judgmentsCitedParaLink', 'judgmentsCitedText'],
          required: false,
          separate: true,
          order: [['judgmentsCitedParties', 'ASC']]
            }
          ]
        },
        {
          model: ShortNote,
          include: [
            {
              model: ShortNotePara,
              attributes: ['shortNoteParaText']
            },
            {
              model: LongNote,
              include: {
                model: LongNotePara,
                attributes: ['longNoteParaText', 'longNoteParaLink']
              }
            }
          ],
          attributes: ['shortNoteText']
        },
        {
          model: JudgmentStatus,
          include: [JudgmentStatusType],
        },
        {
          model: EqualCitation,
          attributes: ['equalCitationText']
        }
      ]
    });

    if (!judgment) {
      return res.status(404).json({ error: 'Judgment not found' });
    }

    // Initialize response object with judgment data
    const response = {
      ...judgment.toJSON()
    };

    const currentCitation = judgment.judgmentCitation;

    if (currentCitation) {
      // If there is a current citation, fetch referring citations
      const countReferringCitations = await judgmentsCited.count({
        where: {
          judgmentsCitedRefferedCitation: {
            [Op.like]: `%${currentCitation}%`
          }
        }
      });

      const referringCitations = await judgmentsCited.findAll({
        attributes: ['judgmentsCitedRefferedCitation', 'judgmentsCitedParties', 'judgmentsCitedParaLink', 'judgementTextId'],
        where: {
          judgmentsCitedRefferedCitation: {
            [Op.like]: `%${currentCitation}%`
          }
        }
      });

      if (referringCitations.length > 0) {
        const judgmentTextIds = referringCitations.map(citation => citation.judgementTextId);

        const referringJudgments = await JudgmentText.findAll({
          where: {
            judgementTextId: {
              [Op.in]: judgmentTextIds
            }
          },
          include: [
            {
              model: Judgment,
              attributes: ['judgmentCitation']
            }
          ]
        });

        response.referringCitationCount = countReferringCitations;
        response.referringCitations = referringJudgments.map(jText => ({
          judgmentCitation: jText.Judgment?.judgmentCitation,
          judgmentsCited: referringCitations.filter(citation => citation.judgementTextId === jText.judgementTextId)
        }));
      } else {
        response.referringCitationCount = 0;
        response.referringCitations = [];
      }
    } else {
      // If no current citation, indicate in the response
      response.referringCitationCount = 0;
      response.referringCitations = [];
    }

    res.json(response);
  } catch (error) {
    console.error('Error fetching judgment:', error.stack);
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
});





``

// Define the Topic model

// API endpoint for topic search

app.get('/api/searchByTopic', async (req, res) => {
    const { topic } = req.query;

    if (!topic) {
        return res.status(400).json({ error: 'Search topic is required' });
    }

    try {
        // Calling the function to get search results based on the term
        const results = await getJudgmentsByTopic(topic);
        // Sending the results as JSON response
        res.json(results);
    } catch (error) {
        // Handling errors - logging and sending 500 Internal Server Error response
        console.error('Error searching judgments by topic:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

export async function getJudgmentsByTopic(topic) {
    let connection;
    try {
        connection = await pool.getConnection();
        const query = `
            SELECT 
            j.*,
                j.judgmentId,
                j.judgmentCitation,
                c.courtName
            FROM 
                judgment j
            left join 
              court c on j.courtId = c.courtId

            INNER JOIN 
                judgmenttopics jt ON j.judgmentId = jt.judgmentId
            INNER JOIN 
                topic t ON jt.topicId = t.topicId
            WHERE 
                t.topicName LIKE ?
            ORDER BY 
              j.judgmentCitation DESC
        `;

        const queryParams = [`%${topic}%`];

        const [rows] = await connection.execute(query, queryParams);
        return rows;
    } catch (error) {
        console.error('Error executing query:', error);
        throw error;
    } finally {
        if (connection) {
            connection.release();
        }
    }
}

app.get('/api/searchByCaseNo', async (req, res) => {
    const { caseinfo } = req.query;
    if (!caseinfo) {
        return res.status(400).json({ error: 'caseinfo is required' });
    }
    try {
        const results = await getSearchByCaseNo(caseinfo);
        res.json(results);
    } catch (error) {
        console.error('Error searching by nominal:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
  });
  export async function getSearchByCaseNo(caseinfo) {
    let connection;
    try {
        connection = await pool.getConnection();
        const query = `
            SELECT 
            j.*,
                j.judgmentId,
                j.judgmentNoText,
                j.judgmentCitation,
                j.judgmentParties,
                 ct.citationCourtName,
                 c.courtName
            FROM 
                judgment j
            left join 
              court c on j.courtId = c.courtId
                 left join
              citation ct on j.judgmentid= ct.judgmentid

            WHERE 
                j.judgmentNoText LIKE ?
            ORDER BY 
              j.judgmentCitation DESC
        `;
        const queryParams = [`%${caseinfo}%`];
        const [rows] = await connection.execute(query, queryParams);
        return rows;
    } catch (error) {
        console.error('Error executing query:', error);
        throw error;
    } finally {
        if (connection) {
            connection.release();
        }
    }
  }


//Articles
///ARTICLES
//defining articles models
const Articles = sequelize.define('Articles', {
  articlesId: { type: DataTypes.INTEGER, primaryKey: true },
  articlesName: { type: DataTypes.STRING(300) },
  articlesCitation: { type: DataTypes.STRING(100) },
  articlesDateTime: { type: DataTypes.STRING(20) },
  articlesFile: { type: DataTypes.STRING(100) },
  articlesAuthor: { type: DataTypes.STRING(100) },
  articlesYear: { type: DataTypes.STRING(20) },
  articlesPublication: { type: DataTypes.STRING(20) },
  articlesPageNo: { type: DataTypes.STRING(20) },
}, {
  tableName: 'articles',
  timestamps: false,
});

// routes for articles search
app.get('/search', async (req, res) => {
  const { term } = req.query;

  if (!term) {
    return res.status(400).json({ error: "Search term is required" });
  }

  try {
    const articles = await Articles.findAll({
      where: {
        [Op.or]: [
          { articlesName: { [Op.like]: `%${term}%` } },
          { articlesAuthor: { [Op.like]: `%${term}%` } }
        ]
      },
      order: [['articlesName', 'ASC']]  // Order by articlesName alphabetically
    });

    if (!articles.length) {
      return res.status(404).json({ error: 'No articles found' });
    }

    res.json(articles);
  } catch (error) {
    console.error('Error searching articles:', error);
    res.status(500).send('Internal Server Error');
  }
});


const Judges = sequelize.define('Judges', {
  judgesId: { type: DataTypes.INTEGER, primaryKey: true },
  judgesName: { type: DataTypes.STRING(200) },
  judgesCitation: { type: DataTypes.STRING(100) },
  judgesDateTime: { type: DataTypes.STRING(20) },
  judgesFile: { type: DataTypes.STRING(100) },
  judgesAuthor: { type: DataTypes.STRING(100) },
}, {
  tableName: 'judges',
  timestamps: false,
});

app.get('/search', async (req, res) => {
  const { term } = req.query;

  if (!term) {
    return res.status(400).json({ error: "Search term is required" });
  }

  try {
    const articles = await Articles.findAll({
      where: {
        [Op.or]: [
          { articlesName: { [Op.like]: `%${term}%` } },
          { articlesAuthor: { [Op.like]: `%${term}%` } }
        ]
      }
    });

    if (!articles.length) {
      return res.status(404).json({ error: 'No articles found' });
    }

    res.json(articles);
  } catch (error) {
    console.error('Error searching articles:', error);
    res.status(500).send('Internal Server Error');
  }
});


//routes for judge search
app.get('/searchJudges', async (req, res) => {
  const { term } = req.query;

  if (!term) {
    return res.status(400).json({ error: "Search term is required" });
  }

  try {
    const judges = await Judges.findAll({
      where: {
        [Op.or]: [
          { judgesName: { [Op.like]: `%${term}%` } },
          { judgesAuthor: { [Op.like]: `%${term}%` } }
        ]
      }
    });

    if (!judges.length) {
      return res.status(404).json({ error: 'No judges found' });
    }

    res.json(judges);
  } catch (error) {
    console.error('Error searching judges:', error);
    res.status(500).send('Internal Server Error');
  }
});



//NOminal index
app.get('/api/searchByNominal', async (req, res) => {
    const { nominal } = req.query;

    if (!nominal) {
        return res.status(400).json({ error: 'Nominal is required' });
    }

    try {
        const results = await getSearchByNominal(nominal);
        res.json(results);
    } catch (error) {
        console.error('Error searching by nominal:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
export async function getSearchByNominal(nominal) {
    let connection;
    try {
        connection = await pool.getConnection();
        const query = `
            SELECT 
            j.*,
                j.judgmentId,
                j.judgmentCitation,
                j.judgmentParties,
            c.courtName
            FROM 
                judgment j
            left join 
              court c on j.courtId = c.courtId
            WHERE 
                j.judgmentParties LIKE ?
              ORDER BY 
              j.judgmentCitation DESC
        `;

        const queryParams = [`%${nominal}%`];

        const [rows] = await connection.execute(query, queryParams);
        return rows;
    } catch (error) {
        console.error('Error executing query:', error);
        throw error;
    } finally {
        if (connection) {
            connection.release();
        }
    }
}



app.get('/api/searchByCaseno', async (req, res) => {
    const { caseType, caseNo, caseYear } = req.query;

    if (!caseType && !caseNo && !caseYear) {
        return res.status(400).json({ error: 'At least one search parameter is required' });
    }

    try {
        const results = await getSearchByCaseno(caseType, caseNo, caseYear);
        res.json(results);
    } catch (error) {
        console.error('Error searching by case number:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


export async function getSearchByCaseno(caseType, caseNo, caseYear) {
    let connection;
    try {
        connection = await pool.getConnection();
        const query = `
            SELECT 
            j.*,
                j.judgmentId,
                j.judgmentCitation,
                jc.judgmentCaseNo,
                jc.judgmentCaseYear
             c.courtName
            FROM 
                judgment j
            left join 
              court c on j.courtId = c.courtId
            INNER JOIN 
                judgmentcasenos jc ON j.judgmentId = jc.judgmentId
            WHERE 
                (? IS NULL OR jc.judgmentCaseNo LIKE ?)
                AND (? IS NULL OR jc.judgmentCaseNo LIKE ?)
                AND (? IS NULL OR jc.judgmentCaseYear LIKE ?)
                ORDER BY 
              j.judgmentCitation DESC
        `;

        const queryParams = [
            caseType ? `%${caseType}%` : null,
            caseType ? `%${caseType}%` : null,
            caseNo ? `%${caseNo}%` : null,
            caseNo ? `%${caseNo}%` : null,
            caseYear ? `%${caseYear}%` : null,
            caseYear ? `%${caseYear}%` : null,
        ];

        const [rows] = await connection.execute(query, queryParams);
        return rows;
    } catch (error) {
        console.error('Error executing query:', error);
        throw error;
    } finally {
        if (connection) {
            connection.release();
        }
    }
}


app.get('/api/searchByJudge', async (req, res) => {
    const { judge } = req.query;

    if (!judge) {
        return res.status(400).json({ error: 'Judge name is required' });
    }

    try {
        const results = await getSearchByJudge(judge);
        res.json(results);
    } catch (error) {
        console.error('Error searching by judge:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
export async function getSearchByJudge(judge) {
    let connection;
    try {
        connection = await pool.getConnection();
        const query = `
            SELECT 
            j.*,
            c.courtName,
                j.judgmentId,
                j.judgmentCitation,
                j.judgmentParties
            FROM 
                judgment j
            INNER JOIN 
                judgmentjudges jj ON j.judgmentId = jj.judgmentId
            INNER JOIN 
                judge ju ON jj.judgeId = ju.judgeId
              left join 
              court c on j.courtId = c.courtId
            WHERE 
                ju.judgeName LIKE ?
            ORDER BY 
              j.judgmentCitation DESC
        `;

        const queryParams = [`%${judge}%`];

        const [rows] = await connection.execute(query, queryParams);
        return rows;
    } catch (error) {
        console.error('Error executing query:', error);
        throw error;
    } finally {
        if (connection) {
            connection.release();
        }
    }
}

app.get('/api/searchByAdvocate', async (req, res) => {
  const { advocateName } = req.query;

  if (!advocateName) {
      return res.status(400).json({ error: 'Advocate name is required' });
  }

  try {
      const results = await getSearchByAdvocate(advocateName);
      res.json(results);
  } catch (error) {
      console.error('Error searching by advocate name:', error);
      res.status(500).json({ error: 'Internal Server Error' });
  }
});

export async function getSearchByAdvocate(advocateName) {
  let connection;
  try {
      connection = await pool.getConnection();
      const query = `
          SELECT 
          j.*,
              j.judgmentId,
              j.judgmentCitation,
              j.judgmentParties,
              a.advocateName,
           c.courtName
            FROM 
                judgment j
            left join 
              court c on j.courtId = c.courtId
          INNER JOIN 
              judgmentadvocates ja ON j.judgmentId = ja.judgmentId
          INNER JOIN 
              advocate a ON ja.advocateId = a.advocateId
          WHERE 
              a.advocateName LIKE ?
            ORDER BY 
              j.judgmentCitation DESC
      `;

      const queryParams = [`%${advocateName}%`];

      const [rows] = await connection.execute(query, queryParams);
      return rows;
  } catch (error) {
      console.error('Error executing query:', error);
      throw error;
  } finally {
      if (connection) {
          connection.release();
      }
  }
}

//citation index
app.get('/api/searchByCitation', async (req, res) => {
    const { CitationText } = req.query;
    if (!CitationText) {
        return res.status(400).json({ error: 'citation is required' });
    }
    try {
        const results = await getSearchByCitation(CitationText);
        res.json(results);
    } catch (error) {
        console.error('Error searching by Citation:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
  });
  export async function getSearchByCitation(CitationText) {
    let connection;
    try {
        connection = await pool.getConnection();
        const query = `
            SELECT 
            j.*,
                j.judgmentId,
                j.judgmentNoText,
                j.judgmentCitation,
                j.judgmentParties,
                 ct.citationCourtName,
                 c.courtName
            FROM 
                judgment j
                 left join
              citation ct on j.judgmentid= ct.judgmentid
              left join 
              court c on j.courtId = c.courtId
            WHERE 
                j.judgmentCitation LIKE ?
            ORDER BY 
              j.judgmentCitation DESC
        `;
        const queryParams = [`${CitationText}`];
        const [rows] = await connection.execute(query, queryParams);
        return rows;
    } catch (error) {
        console.error('Error executing query:', error);
        throw error;
    } finally {
        if (connection) {
            connection.release();
        }
    }
  }

//Equivalent Index

app.get('/api/searchByEquivalent', async (req, res) => {
  const { EqualText } = req.query;
  if (!EqualText) {
      return res.status(400).json({ error: 'EqualText is required' });
  }
  try {
      const results = await getSearchByEquivalent(EqualText);
      res.json(results);
  } catch (error) {
      console.error('Error searching by Equal:', error);
      res.status(500).json({ error: 'Internal Server Error' });
  }
});
export async function getSearchByEquivalent(EqualText) {
  let connection;
  try {
      connection = await pool.getConnection();
      const query = `
          SELECT 
          j.*,
              j.judgmentId,
              j.judgmentNoText,
              j.judgmentCitation,
              j.judgmentParties,
               c.courtName
          FROM 
              judgment j
               left join
             equalcitation e on j.judgmentid= e.judgmentid
            left join 
            court c on j.courtId = c.courtId
          WHERE 
              e.equalCitationText LIKE ?
          ORDER BY 
              j.judgmentCitation DESC
      `;
      const queryParams = [`${EqualText}`];
      const [rows] = await connection.execute(query, queryParams);
      return rows;
  } catch (error) {
      console.error('Error executing query:', error);
      throw error;
  } finally {
      if (connection) {
          connection.release();
      }
  }
}








//Drop Downs
//list acts
async function getLegislationNames() {
  let connection;
  try {
    connection = await pool.getConnection();
    const query = `SELECT legislationName FROM legislation ORDER BY legislationName ASC`;
    const [rows] = await connection.execute(query);
    return rows.map(row => row.legislationName);
  } catch (error) {
    console.error('Error fetching legislation names:', error);
    throw error; // Re-throw the error for handling in the route
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

app.get('/api/legislation/names', async (req, res) => {
  try {
    const legislationNames = await getLegislationNames();
    res.setHeader('Content-Type', 'application/json');
    res.json(legislationNames);
  } catch (error) {
    console.error('Error fetching legislation names:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/api/all-legislation', async (req, res) => {
  try {
    const query = `
      SELECT 
        legislationId,
        legislationName
      FROM 
        legislation
        ORDER BY 
        legislationName ASC;

    `;
    const [rows] = await pool.query(query);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching all legislation:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// fetch sections based on prefix and number DropDown
app.get('/api/sections', async (req, res) => {
  try {
    const { legislationId } = req.query;
    const query = `
      SELECT 
        legislationSectionId,
        CONCAT(legislationSectionPrefix, ' ', legislationSectionNo) AS legislationSectionCombined, 
        legislationSectionName
      FROM 
        legislationsection
      WHERE 
        legislationId = ?
    `;
    const [rows] = await pool.query(query, [legislationId]);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching sections:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});



//fetch sub  DropDown
// fetch sub sections based on section DropDown
app.get('/api/subsections', async (req, res) => {
  try {
    const { legislationSectionId } = req.query;
    const query = `
      SELECT 
        legislationSubSectionId,
        legislationSubSectionName
      FROM 
        legislationsubsection
      WHERE 
        legislationSectionId = ?
    `;
    const [rows] = await pool.query(query, [legislationSectionId]);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching subsections:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});



//fetch topics DropDown

app.get('/api/all-topic', async (req, res) => {
  try {
    const query = `
      SELECT 
    topicId,
    topicName
FROM 
    topic
ORDER BY 
    topicName ASC;


    `;
    const [rows] = await pool.query(query);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching all topics:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

//fetch Advocates DropDown

app.get('/api/all-advocate', async (req, res) => {
  try {
    const query = `
      SELECT 
      advocateId,
    advocateName
FROM 
    advocate
ORDER BY 
    advocateName ASC;


    `;
    const [rows] = await pool.query(query);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching all topics:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

//fetch Judges DropDown
app.get('/api/all-judge', async (req, res) => {
  try {
    const query = `
      SELECT
      judgeId, 
   judgeName
FROM 
    judge
ORDER BY 
    judgeName ASC;


    `;
    const [rows] = await pool.query(query);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching all topics:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


//fetch Nominal DropDown

app.get('/api/all-nominal', async (req, res) => {
  try {
    const query = `
      SELECT 
    distinct judgmentId, judgmentParties
FROM 
     judgment
ORDER BY 
    judgmentParties ASC;


    `;
    const [rows] = await pool.query(query);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching all topics:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


//fetch CaseNo DropDown
app.get('/api/all-caseno', async (req, res) => {
  try {
    const query = `
      SELECT 
     judgmentId, judgmentNoText
FROM 
     judgment
ORDER BY 
    judgmentNoText ASC;


    `;
    const [rows] = await pool.query(query);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching all caseno:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Fetch all words from the 'words' table

app.get('/api/all-words', async (req, res) => {
  try {
    const query = `
      SELECT 
        word
      FROM 
        words
      ORDER BY 
        word ASC;
    `;
    const [rows] = await pool.query(query);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching all words:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

//Statutes
// Route for searching statutes (bareacts)
//Statutes
// Route for searching statutes (bareacts)
app.get("/api/search-bareacts", async (req, res) => {
  const { bareActId, bareActName, sectionPrefix, sectionNo, notificationName } = req.query;

  try {
    const query = `
    SELECT
      b.bareActId,
      b.bareActName,
      b.bareActEnactment,
      b.bareActDate,
      b.bareActDesc,
      b.bareActIndex,
      b.bareActShortName,
      b.bareActState,
      s.bareActSectionId,
      s.bareActSectionNo,
      s.bareActSectionName,
      s.bareActSectionPrefix,        
      s.bareActSectionText,
      s.bareActState AS sectionState,
      f.bareActFormId,
      f.bareActFormName,
      f.bareActFormHTML,
      n.bareActNotificationId,       
      n.bareActNotificationName,     
      n.bareActNotificationHTML,
      sch.bareActScheduleId,
      sch.bareActScheduleName,
      sch.bareActScheduleHTML,
      l.legislationId,
      l.legislationTypeId,
      l.legislationNo,
      l.legislationName,
      l.legislationYear,
      l.legislationHtmlContents,
      l.legislationEnactment,
      l.legislationDesc,
      sn.shortNoteId,
      sn.shortNoteText,
      snp.shortNoteParaText,
      snp.shortNoteParaLink,
      ln.longNoteId,
      ln.longNoteText,
      lnp.longNoteParaText,
      lnp.longNoteParaLink,
      j.judgmentCitation,
      j.judgmentParties -- Added judgmentParties
    FROM
      bareact b
    LEFT JOIN
      bareactsection s ON b.bareActId = s.bareActId
    LEFT JOIN
      bareactform f ON b.bareActId = f.bareActId
    LEFT JOIN
      bareactnotification n ON b.bareActId = n.bareActId
    LEFT JOIN
      bareactschedule sch ON b.bareActId = sch.bareActId
    LEFT JOIN
      legislation l ON b.bareActName = l.legislationName
    LEFT JOIN
      shortnoteleg snl ON l.legislationId = snl.legislationId
    LEFT JOIN
      shortnote sn ON snl.shortNoteId = sn.shortNoteId
    LEFT JOIN
      shortnotepara snp ON sn.shortNoteId = snp.shortNoteId
    LEFT JOIN
      longnote ln ON sn.shortNoteId = ln.shortNoteId
    LEFT JOIN
      longnotepara lnp ON ln.longNoteId = lnp.longNoteId
    LEFT JOIN
      judgment j ON sn.judgmentId = j.judgmentId
    WHERE
      (? IS NULL OR b.bareActId = ?)
      AND (? IS NULL OR b.bareActName LIKE ?)
      AND (? IS NULL OR s.bareActSectionPrefix LIKE ?)
      AND (? IS NULL OR s.bareActSectionNo LIKE ?)
      AND (? IS NULL OR n.bareActNotificationName LIKE ?);
    `;

    const queryParams = [
      bareActId || null,
      bareActId || null,
      bareActName ? `%${bareActName}%` : null,
      bareActName ? `%${bareActName}%` : null,
      sectionPrefix ? `%${sectionPrefix}%` : null,
      sectionPrefix ? `%${sectionPrefix}%` : null,
      sectionNo ? `%${sectionNo}%` : null,
      sectionNo ? `%${sectionNo}%` : null,
      notificationName ? `%${notificationName}%` : null,
      notificationName ? `%${notificationName}%` : null,
    ];

    console.log("Query Parameters:", queryParams);

    const [rows] = await pool.query(query, queryParams);

    const organizedData = [];

    rows.forEach((row) => {
      const existingItem = organizedData.find((item) => item.bareActId === row.bareActId);
      if (existingItem) {
        if (row.bareActSectionId && !existingItem.sections.some((section) => section.sectionId === row.bareActSectionId)) {
          existingItem.sections.push({
            sectionId: row.bareActSectionId,
            sectionNo: row.bareActSectionNo,
            sectionName: row.bareActSectionName,
            sectionPrefix: row.bareActSectionPrefix,
            sectionText: row.bareActSectionText,
            sectionState: row.sectionState,
          });
        }
        if (row.bareActFormId && !existingItem.forms.some((form) => form.formId === row.bareActFormId)) {
          existingItem.forms.push({
            formId: row.bareActFormId,
            formName: row.bareActFormName,
            formHTML: row.bareActFormHTML,
          });
        }
        if (row.bareActNotificationId && !existingItem.notifications.some((notification) => notification.notificationId === row.bareActNotificationId)) {
          existingItem.notifications.push({
            notificationId: row.bareActNotificationId,
            notificationName: row.bareActNotificationName,
            notificationHTML: row.bareActNotificationHTML,
          });
        }
        if (row.bareActScheduleId && !existingItem.schedules.some((schedule) => schedule.scheduleId === row.bareActScheduleId)) {
          existingItem.schedules.push({
            scheduleId: row.bareActScheduleId,
            scheduleName: row.bareActScheduleName,
            scheduleHTML: row.bareActScheduleHTML,
          });
        }
        if (!existingItem.legislation) {
          existingItem.legislation = {
            legislationId: row.legislationId,
            legislationTypeId: row.legislationTypeId,
            legislationNo: row.legislationNo,
            legislationName: row.legislationName,
            legislationYear: row.legislationYear,
            legislationHtmlContents: row.legislationHtmlContents,
            legislationEnactment: row.legislationEnactment,
            legislationDesc: row.legislationDesc,
            shortNotes: [],
            judgmentCitations: {}  // Initialize as an object to hold citations per short note
          };
        }

        let existingShortNote = existingItem.legislation.shortNotes.find(note => note.shortNoteId === row.shortNoteId);
        if (!existingShortNote && row.shortNoteId) {
          existingShortNote = {
            shortNoteId: row.shortNoteId,
            shortNoteText: row.shortNoteText,
            shortNoteParas: [],
            longNotes: [],
            judgmentCitations: [],  // Initialize judgmentCitations for this short note
            judgmentParties: []    // Initialize judgmentParties for this short note
          };
          existingItem.legislation.shortNotes.push(existingShortNote);
        }

        if (existingShortNote && row.shortNoteParaText && !existingShortNote.shortNoteParas.some(note => note.shortNoteParaText === row.shortNoteParaText)) {
          existingShortNote.shortNoteParas.push({
            shortNoteParaText: row.shortNoteParaText,
            shortNoteParaLink: row.shortNoteParaLink,
          });
        }

        if (existingShortNote && row.longNoteId && !existingShortNote.longNotes.some(note => note.longNoteId === row.longNoteId)) {
          existingShortNote.longNotes.push({
            longNoteId: row.longNoteId,
            longNoteText: row.longNoteText,
            longNoteParas: []
          });
        }

        let existingLongNote = existingShortNote ? existingShortNote.longNotes.find(note => note.longNoteId === row.longNoteId) : null;
        if (existingLongNote && row.longNoteParaText && !existingLongNote.longNoteParas.some(note => note.longNoteParaText === row.longNoteParaText)) {
          existingLongNote.longNoteParas.push({
            longNoteParaText: row.longNoteParaText,
            longNoteParaLink: row.longNoteParaLink,
          });
        }

        // Add judgmentCitation to the specific short note if it exists
        if (row.judgmentCitation && existingShortNote && !existingShortNote.judgmentCitations.includes(row.judgmentCitation)) {
          existingShortNote.judgmentCitations.push(row.judgmentCitation);
        }

        // Add judgmentParties to the specific short note if it exists
        if (row.judgmentParties && existingShortNote && !existingShortNote.judgmentParties.includes(row.judgmentParties)) {
          existingShortNote.judgmentParties.push(row.judgmentParties);
        }

      } else {
        const newItem = {
          bareActId: row.bareActId,
          bareActName: row.bareActName,
          bareActEnactment: row.bareActEnactment,
          bareActDate: row.bareActDate,
          bareActDesc: row.bareActDesc,
          bareActIndex: row.bareActIndex,
          bareActShortName: row.bareActShortName,
          bareActState: row.bareActState,
          sections: [],
          forms: [],
          notifications: [],
          schedules: [],
          legislation: {
            legislationId: row.legislationId,
            legislationTypeId: row.legislationTypeId,
            legislationNo: row.legislationNo,
            legislationName: row.legislationName,
            legislationYear: row.legislationYear,
            legislationHtmlContents: row.legislationHtmlContents,
            legislationEnactment: row.legislationEnactment,
            legislationDesc: row.legislationDesc,
            shortNotes: [],
            judgmentCitations: {}  // Initialize as an object to hold citations per short note
          }
        };

        if (row.bareActSectionId) {
          newItem.sections.push({
            sectionId: row.bareActSectionId,
            sectionNo: row.bareActSectionNo,
            sectionName: row.bareActSectionName,
            sectionPrefix: row.bareActSectionPrefix,
            sectionText: row.bareActSectionText,
            sectionState: row.sectionState,
          });
        }
        if (row.bareActFormId) {
          newItem.forms.push({
            formId: row.bareActFormId,
            formName: row.bareActFormName,
            formHTML: row.bareActFormHTML,
          });
        }
        if (row.bareActNotificationId) {
          newItem.notifications.push({
            notificationId: row.bareActNotificationId,
            notificationName: row.bareActNotificationName,
            notificationHTML: row.bareActNotificationHTML,
          });
        }
        if (row.bareActScheduleId) {
          newItem.schedules.push({
            scheduleId: row.bareActScheduleId,
            scheduleName: row.bareActScheduleName,
            scheduleHTML: row.bareActScheduleHTML,
          });
        }

        let shortNote = {
          shortNoteId: row.shortNoteId,
          shortNoteText: row.shortNoteText,
          shortNoteParas: [],
          longNotes: [],
          judgmentCitations: [],  // Initialize judgmentCitations for this short note
          judgmentParties: []    // Initialize judgmentParties for this short note
        };
        if (row.shortNoteId) {
          newItem.legislation.shortNotes.push(shortNote);
        }

        if (row.shortNoteParaText) {
          shortNote.shortNoteParas.push({
            shortNoteParaText: row.shortNoteParaText,
            shortNoteParaLink: row.shortNoteParaLink,
          });
        }

        if (row.longNoteId) {
          const longNote = {
            longNoteId: row.longNoteId,
            longNoteText: row.longNoteText,
            longNoteParas: []
          };
          shortNote.longNotes.push(longNote);
        }

        if (row.longNoteParaText) {
          const longNote = shortNote.longNotes.find(note => note.longNoteId === row.longNoteId);
          if (longNote) {
            longNote.longNoteParas.push({
              longNoteParaText: row.longNoteParaText,
              longNoteParaLink: row.longNoteParaLink,
            });
          }
        }

        if (row.judgmentCitation) {
          shortNote.judgmentCitations.push(row.judgmentCitation);
        }

        if (row.judgmentParties) {
          shortNote.judgmentParties.push(row.judgmentParties);
        }

        organizedData.push(newItem);
      }
    });

    res.json(organizedData);
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});



// Route to fetch all bare act names for default display
app.get("/api/all-bareacts", async (req, res) => {
  try {
    const query = `
      SELECT 
        bareActId,
        bareActName
      FROM 
        bareact
    `;
    const [rows] = await pool.query(query);
    res.json(rows);
  } catch (error) {
    console.error("Error fetching all bare acts:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// fetch all courts
app.get('/api/all-courts', async (req, res) => {
  try {
    const query = `
      SELECT 
     *
FROM 
    court
ORDER BY 
    courtName ASC;
    `;
    const [rows] = await pool.query(query);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching all courts:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
//fetch list of case no citation equals
app.get('/api/all-caseno', async (req, res) => {
    try {
      const query = `
        SELECT 
       judgmentId, judgmentNoText
  FROM 
       judgment
  ORDER BY 
      judgmentNoText ASC;
      `;
      const [rows] = await pool.query(query);
      res.json(rows);
    } catch (error) {
      console.error('Error fetching all caseno:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.get('/api/all-citation', async (req, res) => {
    try {
      const query = `
        SELECT 
       judgmentId, judgmentCitation
  FROM 
       judgment
  ORDER BY 
      judgmentCitation ASC;
      `;
      const [rows] = await pool.query(query);
      res.json(rows);
    } catch (error) {
      console.error('Error fetching all caseno:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.get('/api/all-equivalent', async (req, res) => {
    try {
      const query = `
        SELECT 
      *
  FROM 
       equalcitation
  ORDER BY 
      judgmentId ASC;
      `;
      const [rows] = await pool.query(query);
      res.json(rows);
    } catch (error) {
      console.error('Error fetching all Equals:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

// Use import.meta.url and fileURLToPath to get __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

app.use('/pdfs', express.static(path.join(__dirname, 'pdfs')));

app.listen(port, '0.0.0.0', () => {
  console.log(`Server is running on http://45.117.65.66:${port}`);
});

