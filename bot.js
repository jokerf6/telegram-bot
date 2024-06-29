const TelegramBot = require("node-telegram-bot-api");
const data = require("./data");
const axios = require("axios");
const cron = require("cron").CronJob;
require("dotenv").config();
const mysql = require("mysql2");
// MySQL database connection configuration
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
};
// Replace 'YOUR_BOT_TOKEN' with your actual bot token
const token = "7401095008:AAGz1PrZE5SBie2zJFuhqQtXCe2g9uKav-U";
const bot = new TelegramBot(token, { polling: true });

let connection;

async function connectToDatabase() {
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log("Connected to MySQL database...");
  } catch (error) {
    console.error("Error connecting to MySQL database:", error);
    process.exit(1); // Exit the process on connection error
  }
}
async function insertMatch(chatId, matchId) {
  const query = "INSERT INTO matches (chatId, matchId) VALUES (?, ?)";
  const values = [chatId, matchId];
  try {
    await connection.execute(query, values, (err, result) => {
      if (err) {
        console.error("Error inserting data into MySQL:", err);
        return;
      }
      console.log(
        `Inserted match with chatId ${chatId} and matchId ${matchId}`
      );
    });
  } catch (error) {
    console.error("Error inserting data into MySQL:", error);
  }
}
// Function to read data from MySQL table
async function readMatchesFromDB(matchId, chatId, item) {
  const query = `SELECT * FROM matches WHERE chatId = ${chatId} AND matchId = ${matchId}`;
  try {
    await connection.execute(query, async (err, rows) => {
      if (err) {
        console.error("Error reading data from MySQL:", err);
        return;
      }
      if (rows.length > 0) {
        // bot.sendMessage(chatId, `noAnswer`);
      } else {
        bot.sendMessage(
          chatId,
          ` تذاكر ماتش ${item.teamNameAr2} و ${item.teamNameAr1} نزلت`
        );
        bot.sendMessage(chatId, `فى  ${item.tournament.nameAr} `);
        await insertMatch(chatId, matchId);
      }
    });
  } catch (error) {
    console.error("Error read data into MySQL:", error);
  }
}

async function SendMessage(html, team, chatId) {
  const items = html.filter((item) => item.teamName1.includes(team));
  if (items.length > 0) {
    for (let i = 0; i < items.length; i += 1) {
      readMatchesFromDB(items[i].matchId, chatId, items[i]);
    }
  } else {
    // bot.sendMessage(chatId, `noAnswer`);
  }
}

async function fetchData(team, chatId) {
  const url = "https://tazkarti.com/data/matches-list-json.json";

  try {
    const response = await axios.get(url);
    if (response.status !== 200) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const html = await response.data;
    SendMessage(html, team, chatId);
  } catch (error) {
    console.error("Error fetching data:", error);
  }
}
// Start listening for messages
bot.on("message", (msg) => {
  const chatId = msg.chat.id;

  bot.sendMessage(chatId, "ازيك ياصاحبى اعتبر تذكرتك دي اتحجزت");
  bot.sendMessage(chatId, "بس الاول اكد عليا كده بفريقك", {
    reply_markup: {
      inline_keyboard: data,
    },
  });
});
// Handle callback queries
bot.on("callback_query", (query) => {
  const chatId = query.message.chat.id;
  const option = query.data;

  // Respond based on the selected option
  let response = "";
  let team = "";

  switch (option) {
    case "Ahly":
      team = "Ahly";
      response = "اوعا القطر ده طلع اهلاوى ياعم";
      break;
    case "Zamalek":
      team = "Zamalek";
      response = "وسسسع للملكى";
      break;
    case "Pyramids":
      team = "Pyramids";
      response = "بيراميذاوى";
      break;
    case "Alithad":
      team = "Alithad";
      response = "وسع لسيد البلد";
      break;
    case "Al-Masry":
      team = "Al-Masry";
      response = "Green Eagle";
      break;
    case "Ceramica":
      team = "Ceramica";
      response = "سيراميكا كليوباترا";
      break;
    case "SMC":
      team = "SMC";
      response = "سموجة";
      break;
    case "Enppi":
      team = "Enppi";
      response = "إنبي";
      break;
    case "MOD":
      team = "MOD";
      response = "مودرن فيوتشر";
      break;
    case "TAG":
      team = "TAG";
      response = "طلائع الجيش";
      break;
    case "ISMAILY":
      team = "ISMAILY";
      response = "دراويش السامبا";
      break;
    case "FAR":
      team = "FAR";
      response = "فاركو";
      break;
    case "Baladiyat":
      team = "Baladiyat";
      response = "بلدية المحلة";
      break;
    case "MOQ":
      team = "MOQ";
      response = "المقاولون العرب";
      break;
    case "Dakhleya":
      team = "Dakhleya";
      response = "الداخلية";
      break;
    case "GON":
      team = "GON";
      response = "الجونة";
      break;
    case "BAN":
      team = "BAN";
      response = "البنك الاهلى";
      break;
    case "ZED":
      team = "ZED";
      response = "زد";
      break;
    default:
      response = "Invalid option";
  }

  // Send the response message
  bot.sendMessage(chatId, response);

  // Schedule cron job to run every minute
  // Schedule cron job to run fetchData(team, chatId) every minute
  // Ensure cron job is properly started and handle errors
  try {
    const job = new cron("* * * * *", () => {
      fetchData(team, chatId);
    });
    job.start();
    console.log("Cron job started successfully.");
  } catch (error) {
    console.error("Error starting cron job:", error);
  }
});

// Initialize the connection to MySQL
connectToDatabase();
