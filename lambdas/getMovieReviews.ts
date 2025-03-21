import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { QueryString } from "aws-cdk-lib/aws-logs";

const ddbClient = new DynamoDBClient({ region: process.env.REGION });
const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
    try{
        console.log("[EVENT]", JSON.stringify(event));

        const pathParameters = event?.pathParameters;
        const movieId = pathParameters?.movieId?parseInt(pathParameters.movieId): undefined;
        const queryParams = event?.queryStringParameters;

        if(!movieId) {
            return {
                statusCode: 400,
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ message: "Missing MovieID"}),
            };
        }

        const command = new QueryCommand({
            TableName: process.env.TABLE_NAME,
            KeyConditionExpression: "movieId= :movieId",
            ExpressionAttributeValues: {
                ":movieId": movieId,
            },
        });

        const commandOutput = await ddbDocClient.send(command);
        let reviews = commandOutput.Items || [];

        if (queryParams) {
            if (queryParams.reviewId) {
                reviews = reviews.filter((reviews) => reviews.reviewId.toString() === queryParams.reviewId);
            }
            if (queryParams.reviewerId) {
                reviews = reviews.filter((reviews) => reviews.reviewerId === queryParams.reviewerId);
            }
        }

        return {
            statusCode: 200,
            headers: {"content-type": "application/json"},
            body: JSON.stringify({reviews}),
        };
    } catch (error: any) {
        console.error("Error fetching reviews:", error);
        return {
            statusCode: 500,
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ message: "Internal server error", error}),
        };
    }
};