import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { v4 as uuidv4 } from "uuid";

const ddbClient = new DynamoDBClient({ region: process.env.REGION });
const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    console.log("[EVENT]", JSON.stringify(event));

    if (!event.body) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Request body is missing" }),
      };
    }

    // Parse request body
    const { movieId, reviewerId, content } = JSON.parse(event.body);

    if (!movieId || !reviewerId || !content) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Missing required fields" }),
      };
    }

    // Ensure user is authenticated
    if (!event.headers || !event.headers.authorization) {
      return {
        statusCode: 401,
        body: JSON.stringify({ message: "Unauthorized" }),
      };
    }

    // Generate a unique reviewId
    const reviewId = uuidv4();
    const reviewDate = new Date().toISOString().split("T")[0];

    // Save to DynamoDB
    await ddbDocClient.send(
      new PutCommand({
        TableName: process.env.TABLE_NAME,
        Item: {
          movieId,
          reviewId,
          reviewerId,
          reviewDate,
          content,
        },
      })
    );

    return {
      statusCode: 201,
      body: JSON.stringify({ message: "Review added successfully", reviewId }),
    };
  } catch (error: any) {
    console.error("Error adding review:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Internal server error", error }),
    };
  }
};
