import express from 'express';
import { Sequelize, DataTypes, Op } from 'sequelize';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from "dotenv"; // Import dotenv for managing environment variables

dotenv.config(); // Load environment variables from .env file


const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
import mysql from 'mysql2/promise';

const sequelize = new Sequelize(process.env.MYSQL_DATABASE, process.env.MYSQLUSER, process.env.MYSQLPASSWORD, {
  host: process.env.MYSQLHOST,
  dialect: 'mysql',
  port: process.env.MYSQLPORT,  // Add port configuration if necessary
});

const pool = mysql.createPool({
  connectionLimit: 10,
  host: process.env.MYSQLHOST,
  user: process.env.MYSQLUSER,
  password: process.env.MYSQLPASSWORD,
  database: process.env.MYSQL_DATABASE,
  port: process.env.MYSQLPORT,  // Add port configuration if necessary
});

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


// API endpoint to fetch judgments along with related data
app.get('/judgments/:judgmentId', async (req, res) => {
  const { judgmentId } = req.params;

  try {
    const judgment = await Judgment.findByPk(judgmentId, {
      include: [
        {
          model: JudgmentText,
          include: [
            {
              model: JudgmentTextPara,
              attributes: ['judgementTextParaText', 'judgementTextParaNo']  // Include judgementTextParaNo here
            },
            {
              model: judgmentsCited,
              attributes: ['judgmentsCitedParties', 'judgmentsCitedRefferedCitation', 'judgmentsCitedEqualCitation', 'judgmentsCitedParaLink']
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

    console.log('Fetched judgment data:', JSON.stringify(judgment, null, 2));
    res.json(judgment);
  } catch (error) {
    console.error('Error fetching judgment:', error.stack); // Log the full error stack
    res.status(500).json({ error: 'Internal Server Error', details: error.message }); // Return error details
  }
});

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

//ADVANCE SEARCH PAGE
app.get('/api/searchAdvanced', async (req, res) => {
  const acts = Array.isArray(req.query.acts) ? req.query.acts : req.query.acts ? [req.query.acts] : [];
  const sections = Array.isArray(req.query.sections) ? req.query.sections : req.query.sections ? [req.query.sections] : [];
  const subsections = Array.isArray(req.query.subsections) ? req.query.subsections : req.query.subsections ? [req.query.subsections] : [];
  const topics = Array.isArray(req.query.topics) ? req.query.topics : req.query.topics ? [req.query.topics] : [];
  const judges = Array.isArray(req.query.judges) ? req.query.judges : req.query.judges ? [req.query.judges] : [];
  const advocates = Array.isArray(req.query.advocates) ? req.query.advocates : req.query.advocates ? [req.query.advocates] : [];

  if (acts.length === 0 && sections.length === 0 && subsections.length === 0 && topics.length === 0 && judges.length === 0 && advocates.length === 0) {
      return res.status(400).json({ error: 'At least one search parameter is required' });
  }

  try {
      const results = await getJudgmentsByMultipleCriteria(acts, sections, subsections, topics, judges, advocates);
      res.json(results);
  } catch (error) {
      console.error('Error executing advanced search:', error);
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

  if (acts.length === 0 && sections.length === 0 && subsections.length === 0 && topics.length === 0 && judges.length === 0 && advocates.length === 0) {
      return res.status(400).json({ error: 'At least one search parameter is required' });
  }

  try {
      const results = await getJudgmentsByMultipleCriteria(acts, sections, subsections, topics, judges, advocates);
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
              c.courtName
          FROM 
              judgment j
              left join 
            court c on j.courtId = c.courtId
          LEFT JOIN shortnote sn ON j.judgmentId = sn.judgmentId
          LEFT JOIN shortnoteleg snl ON sn.shortNoteId = snl.shortNoteId
          LEFT JOIN legislation l ON snl.legislationId = l.legislationId
          LEFT JOIN shortnotelegsec snls ON sn.shortNoteId = snls.shortNoteId
          LEFT JOIN legislationsection ls ON snls.legislationSectionId = ls.legislationSectionId
          LEFT JOIN shortnotelegsubsec snlss ON sn.shortNoteId = snlss.shortNoteId
          LEFT JOIN legislationsubsection lss ON snlss.legislationSubSectionId = lss.legislationSubSectionId
          INNER JOIN judgmenttopics jt ON j.judgmentId = jt.judgmentId
          INNER JOIN topic t ON jt.topicId = t.topicId
          INNER JOIN judgmentjudges jj ON j.judgmentId = jj.judgmentId
          INNER JOIN judge ju ON jj.judgeId = ju.judgeId
          INNER JOIN judgmentadvocates ja ON j.judgmentId = ja.judgmentId
          INNER JOIN advocate a ON ja.advocateId = a.advocateId
          WHERE 
      `;

      const conditions = [];

      if (actKeywords.length > 0) {
          actKeywords.forEach(_ => {
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
          sectionKeywords.forEach(_ => {
              conditions.push(`
                  EXISTS (
                      SELECT 1 
                      FROM shortnote sn
                      JOIN shortnotelegsec snls ON sn.shortNoteId = snls.shortNoteId
                      JOIN legislationsection ls ON snls.legislationSectionId = ls.legislationSectionId
                      WHERE sn.judgmentId = j.judgmentId 
                      AND ls.legislationSectionName LIKE ?
                  )
              `);
          });
      }

      if (subsectionKeywords.length > 0) {
          subsectionKeywords.forEach(_ => {
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
          topicKeywords.forEach(_ => {
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
          judgeKeywords.forEach(_ => {
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
          advocateKeywords.forEach(_ => {
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





//Drop Downs
//list acts
async function getLegislationNames() {
  let connection;
  try {
    connection = await pool.getConnection();
    const query = `SELECT legislationName FROM legislation`;
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



//fetch sub sections DropDown
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
app.get("/api/search-bareacts", async (req, res) => {
  const { bareActId, bareActName, sectionPrefix, sectionNo, notificationName } =
    req.query;

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
        sch.bareActScheduleHTML
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
    WHERE 
        (? IS NULL OR b.bareActId = ?)
        AND (? IS NULL OR b.bareActName LIKE ?)
        AND (? IS NULL OR s.bareActSectionPrefix LIKE ?)
        AND (? IS NULL OR s.bareActSectionNo LIKE ?)
        AND (? IS NULL OR n.bareActNotificationName LIKE ?);
    `;

    const [rows] = await pool.query(query, [
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
    ]);

    const organizedData = [];

    rows.forEach((row) => {
      const existingItem = organizedData.find(
        (item) => item.bareActId === row.bareActId,
      );
      if (existingItem) {
        if (
          row.bareActSectionId &&
          !existingItem.sections.some(
            (section) => section.sectionId === row.bareActSectionId,
          )
        ) {
          existingItem.sections.push({
            sectionId: row.bareActSectionId,
            sectionNo: row.bareActSectionNo,
            sectionName: row.bareActSectionName,
            sectionPrefix: row.bareActSectionPrefix,
            sectionText: row.bareActSectionText,
            sectionState: row.sectionState,
          });
        }
        if (
          row.bareActFormId &&
          !existingItem.forms.some((form) => form.formId === row.bareActFormId)
        ) {
          existingItem.forms.push({
            formId: row.bareActFormId,
            formName: row.bareActFormName,
            formHTML: row.bareActFormHTML,
          });
        }
        if (
          row.bareActNotificationId &&
          !existingItem.notifications.some(
            (notification) =>
              notification.notificationId === row.bareActNotificationId,
          )
        ) {
          existingItem.notifications.push({
            notificationId: row.bareActNotificationId,
            notificationName: row.bareActNotificationName,
            notificationHTML: row.bareActNotificationHTML,
          });
        }
        if (
          row.bareActScheduleId &&
          !existingItem.schedules.some(
            (schedule) => schedule.scheduleId === row.bareActScheduleId,
          )
        ) {
          existingItem.schedules.push({
            scheduleId: row.bareActScheduleId,
            scheduleName: row.bareActScheduleName,
            scheduleHTML: row.bareActScheduleHTML,
          });
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
        organizedData.push(newItem);
      }
    });

    res.json(organizedData);
  } catch (error) {
    console.error("Error fetching search results:", error);
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

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

