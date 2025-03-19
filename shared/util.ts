import { marshall } from "@aws-sdk/util-dynamodb";
import { Movie, MovieCast } from "./types";

type Entity = Movie | MovieCast;  // NEW
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

export function generateBatchesForReviews(reviews: any[], batchSize = 25) {
  const batches = [];
  for (let i = 0; i < reviews.length; i += batchSize) {
    const batch = reviews.slice(i, i + batchSize).map((review) => ({
      PutRequest: {
        Item: {
          movieId: { N: review.movieId.toString() },
          reviewId: { N: review.reviewId.toString() },
          reviewerId: { S: review.reviewerId },
          reviewDate: { S: review.reviewDate },
          content: { S: review.content },
        },
      },
    }));
    batches.push(batch);
  }
  return batches;
}
