import * as cdk from "aws-cdk-lib";
import * as lambdanode from "aws-cdk-lib/aws-lambda-nodejs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as custom from "aws-cdk-lib/custom-resources";
import { Construct } from "constructs";
// import * as sqs from 'aws-cdk-lib/aws-sqs';
import { generateBatch } from "../shared/util";
import { movieReviews } from "../seed/movies";
import * as apig from "aws-cdk-lib/aws-apigateway";
import * as iam from 'aws-cdk-lib/aws-iam'

export class RestAPIStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Tables 

    const movieReviewsTable = new dynamodb.Table(this, "MovieReviewTable", {
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: "movieId", type: dynamodb.AttributeType.NUMBER },
      sortKey: { name: "reviewId", type: dynamodb.AttributeType.NUMBER },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      tableName: "MovieReviews"
    });

    // Functions 

    const commonProps =
    {
      architecture: lambda.Architecture.ARM_64,
      runtime: lambda.Runtime.NODEJS_18_X,
      entry: `${__dirname}/../lambdas/getMovieReviews.ts`,
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
      environment: {
        TABLE_NAME: movieReviewsTable.tableName,
        REGION: "eu-west-1",
      },
    }

    const getMovieReviewsFn = new lambdanode.NodejsFunction(
      this,
      "GetMovieReviewsFn",
      {
        ...commonProps,

        entry: `${__dirname}/../lambdas/getMovieReviews.ts`,

      }
    );
    const addMovieReviewFn = new lambdanode.NodejsFunction(this, "AddMovieReviewFn", {
      ...commonProps,
      entry: `${__dirname}/../lambdas/addMovieReview.ts`,

    });

    const updateReviewFn = new lambdanode.NodejsFunction(this, "UpdateReviewFn", {
      ...commonProps,
      entry: `${__dirname}/../lambdas/updateReview.ts`,

    });

    const getTranslatedReview = new lambdanode.NodejsFunction(this, "GetTranslatedReview", {
      ...commonProps,
      entry: `${__dirname}/../lambdas/getTranslatedReviews.ts`,

    });

    new custom.AwsCustomResource(this, `moviesReviewInitData`, {
      onCreate: {
        service: "DynamoDB",
        action: "batchWriteItem",
        parameters: {
          RequestItems: {
            [movieReviewsTable.tableName]: generateBatch(movieReviews),
          },
        },
        physicalResourceId: custom.PhysicalResourceId.of(`moviesReviewInitData`),
      },
      policy: custom.AwsCustomResourcePolicy.fromSdkCalls({
        resources: [movieReviewsTable.tableArn],
      }),
    });

    getTranslatedReview.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["translate:TranslateText"],
        resources: ["*"],
        effect: iam.Effect.ALLOW,
      })
    );


    // Permissions

    movieReviewsTable.grantReadData(getMovieReviewsFn);
    movieReviewsTable.grantReadWriteData(addMovieReviewFn);
    movieReviewsTable.grantReadWriteData(updateReviewFn);
    movieReviewsTable.grantReadData(getTranslatedReview);

    // REST API 
    const api = new apig.RestApi(this, "RestAPI", {
      description: "demo api",
      deployOptions: {
        stageName: "dev",
      },
      defaultCorsPreflightOptions: {
        allowHeaders: ["Content-Type", "X-Amz-Date", "Authorization"],
        allowMethods: ["OPTIONS", "GET", "POST", "PUT", "PATCH", "DELETE"],
        allowCredentials: true,
        allowOrigins: ["*"],
      },
    });

    // Movies endpoint
    const moviesEndpoint = api.root.addResource("movies");
    const reviewRootEndpoint = api.root.addResource("reviews")
    //Movie reviews end point
    const reviewsEndpoint = moviesEndpoint.addResource("reviews");
    const specificReviewEndpoint = reviewsEndpoint.addResource("{movieId}");
    const movieReviewsEndpoint = moviesEndpoint.addResource("{movieId}").addResource("reviews").addResource("{reviewId}");
    const translateMovieEndpoint = reviewRootEndpoint.addResource("{reviewId}").addResource("{movieId}").addResource("translation")
    specificReviewEndpoint.addMethod(
      "GET",
      new apig.LambdaIntegration(getMovieReviewsFn, { proxy: true })
    );
    reviewsEndpoint.addMethod(
      "POST",
      new apig.LambdaIntegration(addMovieReviewFn, { proxy: true })
    );
    movieReviewsEndpoint.addMethod(
      "PUT",
      new apig.LambdaIntegration(updateReviewFn, { proxy: true })
    );
    translateMovieEndpoint.addMethod(
      "GET",
      new apig.LambdaIntegration(getTranslatedReview, { proxy: true })
    );
  }
}