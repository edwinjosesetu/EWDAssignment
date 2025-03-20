import { marshall } from "@aws-sdk/util-dynamodb";
import {MovieReviews} from "../shared/types";

type Entity = MovieReviews  // NEW
export const generateItem = (entity: Entity) => {
  return {
    PutRequest: {
      Item: marshall(entity),
    },
  };
};

export const generateBatch = (data: Entity[]) => {
  return data.map((e) => {
    return generateItem(e);
  });
};
