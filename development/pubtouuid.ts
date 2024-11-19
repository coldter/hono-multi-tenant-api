import { logger } from "@/pkg/logger/logger";
import { TypeID } from "typeid-js";

const pubId = "pred_01jc644p4xe4f8ktskd28yp652";
const id = TypeID.fromString(pubId).toUUID();

logger.log("🚀 ~ file: uuidtopub.ts ~ line 10 ~ id", id);
