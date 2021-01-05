import * as cdk from '@aws-cdk/core';
import * as iam from '@aws-cdk/aws-iam';
import * as s3 from '@aws-cdk/aws-s3';
import * as apigateway from '@aws-cdk/aws-apigateway';

export class CdkApigatewayProxyS3Stack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // The code that defines your stack goes here
    const PREFIX :string = this.node.tryGetContext('prefix');

    //
    // S3 bucket
    //
    const bucket = new s3.Bucket(this, `${PREFIX}bucket`, {
      encryption: s3.BucketEncryption.KMS_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      bucketName: `${PREFIX}bucket`,
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });

    //
    // IAM Role
    //
    const policyStatement = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
    })
    policyStatement.addActions(
      's3:PutObject'
    );
    policyStatement.addResources(
      bucket.bucketArn + '/*'
    );

    const policyDocument = new iam.PolicyDocument({statements:[policyStatement]})

    const role = new iam.Role(this, `${PREFIX}role`, {
      assumedBy: new iam.ServicePrincipal('apigateway.amazonaws.com'),
      description: 'CDK for API Gateway Proxy for S3',
      roleName: `${PREFIX}role`,
      inlinePolicies: {
        'policy': policyDocument
      }
    });

    //
    // API Gateway
    //
    const api = new apigateway.RestApi(this, `${PREFIX}apigateway`,{
      restApiName: `${PREFIX}apigw`,
      endpointTypes: [apigateway.EndpointType.REGIONAL],
      description: 'CDK for API Gateway Proxy for S3'
    });
    const bucketNameResource = api.root.addResource('{bucket_name}');
    const objectKeyResource = bucketNameResource.addResource('{object_key}')
    objectKeyResource.addMethod('PUT', new apigateway.AwsIntegration({
      service: 's3',
      integrationHttpMethod: 'PUT',
      path: '{bucket_name}/{object_key}',
      // @aws-cdk/aws-apigateway.IntegrationOptions
      options: {
        credentialsRole: role,
        requestParameters: {
          "integration.request.path.bucket_name": "method.request.path.bucket_name",
          "integration.request.path.object_key": "method.request.path.object_key"
        },
        integrationResponses: [
          {
            statusCode: "200",
            // contentHandling: pass-thru
          }
        ]
      }
    }),
    // @aws-cdk/aws-apigateway.MethodOptions
    {
      requestParameters: {
        "method.request.path.bucket_name": true,
        "method.request.path.object_key": true
      },
      methodResponses: [
        {
          statusCode: "200",
          responseModels: {
            "application/json": new apigateway.EmptyModel()
          }
        }
      ]
    });

    //
    // Output
    //
    new cdk.CfnOutput(this, 'S3Bucket', {
      value: bucket.bucketName
    });
    new cdk.CfnOutput(this, 'PutURL', {
      value: `https://${api.restApiId}.execute-api.${this.region}.amazonaws.com/prod/${bucket.bucketName}`
    });
  }
}
