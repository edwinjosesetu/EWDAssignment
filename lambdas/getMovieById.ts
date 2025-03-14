import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";

const ddbDocClient = createDDbDocClient();

export const handler: APIGatewayProxyHandlerV2 = async (event) => {    
  try {
    console.log("[EVENT]", JSON.stringify(event));

    const pathParameters = event?.pathParameters;
    const queryStringParameters = event?.queryStringParameters || {};
    const movieId = pathParameters?.movieId ? parseInt(pathParameters.movieId) : undefined;
    const includeCast = queryStringParameters.cast === "true";

    if (!movieId) {
      return {
        statusCode: 400,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ Message: "Missing movieId" }),
      };
    }

    // Fetch Movie Details
    const movieCommandOutput = await ddbDocClient.send(
      new GetCommand({
        TableName: process.env.TABLE_NAME,
        Key: { id: movieId },
      })
    );

    console.log("GetCommand response: ", movieCommandOutput);

    if (!movieCommandOutput.Item) {
      return {
        statusCode: 404,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ Message: "Invalid movieId" }),
      };
    }

    let responseBody = { ...movieCommandOutput.Item };

    // If cast=true, fetch the cast details
    if (includeCast) {
      const castCommandOutput = await ddbDocClient.send(
        new QueryCommand({
          TableName: process.env.CAST_TABLE_NAME,
          KeyConditionExpression: "movieId = :movieId",
          ExpressionAttributeValues: { ":movieId": movieId },
        })
      );

      console.log("QueryCommand response (cast): ", castCommandOutput);

      responseBody.cast = castCommandOutput.Items || [];
    }

    // Return Response
    return {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ data: responseBody }),
    };
  } catch (error: any) {
    console.error("Error fetching movie:", error);
    return {
      statusCode: 500,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ error: "Internal Server Error" }),
    };
  }
};

function createDDbDocClient() {
  const ddbClient = new DynamoDBClient({ region: process.env.REGION });
  return DynamoDBDocumentClient.from(ddbClient);
}
