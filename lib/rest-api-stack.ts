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
import { UserPool } from "aws-cdk-lib/aws-cognito";
import { AuthApi } from "./auth-api";
import { AppApi } from "./app-api";

export class RestAPIStack extends cdk.Stack {  
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const userPool = new UserPool(this, "UserPool", {
      signInAliases: { username: true, email: true },
      selfSignUpEnabled: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const userPoolId = userPool.userPoolId;

    const appClient = userPool.addClient("AppClient", {
      authFlows: { userPassword: true },
    });

    const userPoolClientId = appClient.userPoolClientId;

    new AuthApi(this, 'AuthServiceApi', {
      userPoolId: userPoolId,
      userPoolClientId: userPoolClientId,
    });

    new AppApi(this, 'AppApi', {
      userPoolId: userPoolId,
      userPoolClientId: userPoolClientId,
    } );
  } 
}