import { getDatabase } from "@netlify/database";
import { makePollHandler } from "../../poll-api/netlify-handler.mjs";

export default makePollHandler(() => getDatabase());
