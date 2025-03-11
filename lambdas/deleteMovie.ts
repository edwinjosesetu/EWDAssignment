import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, DeleteCommand } from "@aws-sdk/lib-dynamodb";

const ddbDocClient = createDDbDocClient();

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        console.log("Event: ", event);

        // Extract movie ID from the path parameters
        const movieId = event.pathParameters?.movieId;

        if(!movieId) {
            return {
                statusCode: 400,
                headers: {"content-type": "application/json"},
                body: JSON.stringify({ message: "Movie ID is required"}), 
            };
        }

        await ddbDocClient.send(
            new DeleteCommand({
              TableName: process.env.TABLE_NAME,
              Key: { id: Number(movieId) }, // Ensure it's a number if your table uses NUMBER type
            })
          );

          return {
            statusCode: 200,
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ message: `Movie with ID ${movieId} deleted successfully` }),
          };
        } catch (error) {
            console.error("Error deleting movie:", error);
            return {
              statusCode: 500,
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ error: "Failed to delete movie" }),
            };
          }
        };

        function createDDbDocClient() {
            const ddbClient = new DynamoDBClient({ region: process.env.REGION });
            return DynamoDBDocumentClient.from(ddbClient);
        }