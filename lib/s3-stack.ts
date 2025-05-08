import { CfnOutput, RemovalPolicy, Stack, StackProps } from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment";
import { Construct } from "constructs";

export class FrontendStack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps) {
    super(scope, id, props);

    const siteBucket = new s3.Bucket(this, "SiteBucket", {
      publicReadAccess: true,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ACLS,
      accessControl: s3.BucketAccessControl.BUCKET_OWNER_FULL_CONTROL,
      websiteIndexDocument: "index.html",
    });

    new s3deploy.BucketDeployment(this, "DeplotWebsite", {
      sources: [s3deploy.Source.asset("./dist")],
      destinationBucket: siteBucket,
    });

    new CfnOutput(this, "WebsiteURL", {
      value: siteBucket.bucketWebsiteUrl,
    });
  }
}