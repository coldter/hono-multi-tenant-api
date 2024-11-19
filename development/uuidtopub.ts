import { logger } from "@/pkg/logger/logger";
import { idTypes } from "@/pkg/utils/typeid";
import { TypeID, type TypeId } from "typeid-js";

const uuidToPublicId = <const T extends keyof typeof idTypes>(prefix: T, input: string) => {
  const prefixValue = idTypes[prefix];

  return TypeID.fromUUID(prefixValue, input).asType(prefixValue).toString() as TypeId<T>;
};

const uuid = "01930c42-589d-711e-89eb-336891eb18a2";

logger.log("🚀 ~ uuidToPublicId ~ uuidToPublicId:", uuidToPublicId("prediction", uuid));
