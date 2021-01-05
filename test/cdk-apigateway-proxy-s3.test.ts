import { expect as expectCDK, matchTemplate, MatchStyle, SynthUtils } from '@aws-cdk/assert';
import * as cdk from '@aws-cdk/core';
import '@aws-cdk/assert/jest';
import * as CdkApigatewayProxyS3 from '../lib/cdk-apigateway-proxy-s3-stack';
import { Role } from '@aws-cdk/aws-iam';

test('Snapshot Test', () => {
  const app = new cdk.App();
  const stack = new CdkApigatewayProxyS3.CdkApigatewayProxyS3Stack(app, 'MyTestStack');
  expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});

test('Bucket Test', () => {
  const app = new cdk.App();
  const stack = new CdkApigatewayProxyS3.CdkApigatewayProxyS3Stack(app, 'MyTestStack');

  const PREFIX :string = stack.node.tryGetContext('prefix');

  expect(stack).toHaveResource('AWS::S3::Bucket', {
    BucketName: `${PREFIX}bucket`,
    PublicAccessBlockConfiguration: {
      BlockPublicAcls : true,
      BlockPublicPolicy : true,
      IgnorePublicAcls : true,
      RestrictPublicBuckets : true
    },
    BucketEncryption : {
      ServerSideEncryptionConfiguration: [{
        ServerSideEncryptionByDefault: {
          SSEAlgorithm: "aws:kms"
        }
      }]
    }
  });
});

test('IAM Test', () => {
  const app = new cdk.App();
  const stack = new CdkApigatewayProxyS3.CdkApigatewayProxyS3Stack(app, 'MyTestStack');
  const PREFIX :string = stack.node.tryGetContext('prefix');

  expect(stack).toHaveResource('AWS::IAM::Role', {
    RoleName: `${PREFIX}role`,
    AssumeRolePolicyDocument: {
      "Version": "2012-10-17",
      "Statement": [
        {
          "Effect": "Allow",
          "Principal": {
              "Service": "apigateway.amazonaws.com"
          },
          "Action": "sts:AssumeRole"
        }
      ]
    },
    Policies: [
      {
        "PolicyName": "policy",
        "PolicyDocument": {
          "Version": "2012-10-17",
          "Statement": [
            {
              "Effect": "Allow",
              "Action": "s3:PutObject",
              "Resource": `${PREFIX}bucket/*`
            }
          ]
        }
      }
    ]
  });
});

/*
test('Empty Stack', () => {
    const app = new cdk.App();
    // WHEN
    const stack = new CdkApigatewayProxyS3.CdkApigatewayProxyS3Stack(app, 'MyTestStack');
    // THEN
    expectCDK(stack).to(matchTemplate({
      "Resources": {}
    }, MatchStyle.EXACT))
});
*/