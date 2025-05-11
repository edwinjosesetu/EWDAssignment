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
import * as node from "aws-cdk-lib/aws-lambda-nodejs"

type AppApiProps = {
  userPoolId: string;
  userPoolClientId: string;
};


export class AppApi extends Construct {


  constructor(scope: Construct, id: string, props: AppApiProps) {
    super(scope, id,);

    // Tables 

    const movieReviewsTable = new dynamodb.Table(this, "MovieReviewTable", {
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: "movieId", type: dynamodb.AttributeType.NUMBER },
      sortKey: { name: "reviewId", type: dynamodb.AttributeType.NUMBER },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      tableName: "MovieReviews"
    });

    //table for frontend
    const reviewsTable = new dynamodb.Table(this, "FavouriteReviewsTable", {
      partitionKey: { name: "ReviewId", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      tableName: "FavouriteReviewsTable",
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

    // Create the postMovieReviews Lambda function
    const addFrontendReview = new node.NodejsFunction(this, "AddFrontendReview", {
      ...commonProps,
      entry: `${__dirname}/../lambdas/addReview.ts`,
      environment: {
        REVIEWS_TABLE_NAME: reviewsTable.tableName,
      },
    });
    const getFrontendReview = new node.NodejsFunction(this, "GetFrontendReview", {
      ...commonProps,
      entry: `${__dirname}/../lambdas/getReview.ts`,
      environment: {
        REVIEWS_TABLE_NAME: reviewsTable.tableName,
      },
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

    const authorizerFn = new node.NodejsFunction(this, "AuthorizerFn", {
      ...commonProps,
      entry: "./lambdas/auth/authorizer.ts",
    });

    const requestAuthorizer = new apig.RequestAuthorizer(
      this,
      "RequestAuthorizer",
      {
        identitySources: [apig.IdentitySource.header("Cookie")],
        handler: authorizerFn,
        resultsCacheTtl: cdk.Duration.minutes(0),
      }
    );


    // Permissions

    movieReviewsTable.grantReadData(getMovieReviewsFn);
    movieReviewsTable.grantReadWriteData(addMovieReviewFn);
    movieReviewsTable.grantReadWriteData(updateReviewFn);
    movieReviewsTable.grantReadData(getTranslatedReview);
    reviewsTable.grantWriteData(addFrontendReview);
    reviewsTable.grantReadData(getFrontendReview);

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
    const reviewsResource = api.root.addResource("frontendreviews");
    specificReviewEndpoint.addMethod(
      "GET",
      new apig.LambdaIntegration(getMovieReviewsFn, { proxy: true })
    );
    reviewsEndpoint.addMethod(
      "POST",
      new apig.LambdaIntegration(addMovieReviewFn, { proxy: true }),
      {
        authorizer: requestAuthorizer,
        authorizationType: apig.AuthorizationType.CUSTOM,
      }
    );
    movieReviewsEndpoint.addMethod(
      "PUT",
      new apig.LambdaIntegration(updateReviewFn, { proxy: true }),
      {
        authorizer: requestAuthorizer,
        authorizationType: apig.AuthorizationType.CUSTOM,
      }
    );
    translateMovieEndpoint.addMethod(
      "GET",
      new apig.LambdaIntegration(getTranslatedReview, { proxy: true })
    );
    reviewsResource.addMethod(
      "POST",
      new apig.LambdaIntegration(addFrontendReview, { proxy: true })
    );
    reviewsResource.addMethod(
      "GET",
      new apig.LambdaIntegration(getFrontendReview, { proxy: true })
    );
  }
}