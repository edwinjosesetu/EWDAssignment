#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { RestAPIStack } from "../lib/rest-api-stack";
import { FrontendStack } from "../lib/s3-stack";

const app = new cdk.App();
new RestAPIStack(app, "RestAPIStack", { env: { region: "eu-west-1" } });
new FrontendStack(app, "FrontendStack", { env: { region: "eu-west-1" } });