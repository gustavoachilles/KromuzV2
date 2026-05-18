const { PrismaClient } = require("@prisma/client");
require("dotenv").config();

const p = new PrismaClient();

p.lead.deleteMany({ where: { origem: "importacao" } })
  .then(function(r) { console.log("Deletados:", r.count, "leads"); })
  .catch(console.error)
  .finally(function() { p.$disconnect(); });
