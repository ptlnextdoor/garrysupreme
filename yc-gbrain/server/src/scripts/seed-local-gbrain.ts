import { seedLocalGBrain } from "../gbrain-local.js";

const companyId = process.argv[2] ?? "costco";

const result = await seedLocalGBrain(companyId);
console.log(JSON.stringify(result, null, 2));
