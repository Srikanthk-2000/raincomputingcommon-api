const config = {
    MONGO_URL:
    "mongodb://localhost:27017/HsuanyehRain",
    // "mongodb://common:go8JfN0GBH9RCe05HMA2NPywPTs5cseCYDkXIrXcCL4sIdjX2GIivTkA6qcS4bZb1tIAOra61qojACDbmZQXGQ==@common.mongo.cosmos.azure.com:10255/?ssl=true&retrywrites=false&replicaSet=globaldb&maxIdleTimeMS=120000&appName=@common@",
    
      JWT_SECRET: "dev",
    PORT: 5000,
    MAIL_SERVICE: "gmail",
    SENDER_MAIL: "rpmongotest@gmail.com",
    MAIL_PASSWORD: "hspbrzryscrtuqqf",
    RESET_PASSWORD: "dev123",
    FE_URL: "https://raincomputing.net",
    DEFAULT_RES_ERROR: "Something wrong occured",
    MAIL_CLIENT_ID:
      "729499635503-cdvdr8eba2h50m0qv5skfpclvoa1jbuk.apps.googleusercontent.com",
    MAIL_CLIENT_SECRET: "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",
    MAIL_REFRESH_TOKEN:
      "1//047EPQ7bdOgSrCgYIARAAGAQSNwF-L9Ir--97X5aljQ0zV4rJMfIuY1H6IGEcACYfpR73cQQGzG34N4d6wiEgm5ijKOoJ7hWfAGE",
    MAIL_REDIRECT_URI: "http://localhost:8080/api/mail/searchMail",
  };
  
  module.exports = config;
  