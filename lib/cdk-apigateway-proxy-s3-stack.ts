import * as cdk from '@aws-cdk/core';
import * as iam from '@aws-cdk/aws-iam';
import * as s3 from '@aws-cdk/aws-s3';
import * as apigateway from '@aws-cdk/aws-apigateway';

export class CdkApigatewayProxyS3Stack extends cdk.Stack {
    constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);
        //
        // S3 bucket
        //
        const bucket = new s3.Bucket(this, `bucket`, {
            encryption: s3.BucketEncryption.KMS_MANAGED,
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            removalPolicy: cdk.RemovalPolicy.DESTROY
        });

        const methodResponses =[
            {
                statusCode: '200',
                responseParameters: {
                    'method.response.header.Content-Type': false,
                    'method.response.header.Content-Disposition': false,
                }
            },
            {statusCode: '404'},
        ];

        const integrationResponses = [
            {
                statusCode: '200',
                responseParameters: {
                    'method.response.header.Content-Type': 'integration.response.header.Content-Type',
                    'method.response.header.Content-Disposition': 'integration.response.header.Content-Disposition',
                },
            },
            {selectionPattern: '^404', statusCode: '404'},
        ];

        const role = new iam.Role(this, 'S3IntegrationRole', {
            assumedBy: new iam.ServicePrincipal('apigateway.amazonaws.com'),
        });
        bucket.grantRead(role);
        bucket.grantPut(role)

        const api = new apigateway.RestApi(this, 'api', {
            deployOptions: {
                metricsEnabled: true,
                loggingLevel: apigateway.MethodLoggingLevel.INFO,
            },
            binaryMediaTypes: [
                // To stop API GW from touching binary files
                'image/*',
            ],
        });
        // Hack to disable remote api endpoint
        // (api.node.children[0] as apigateway.CfnRestApi).addPropertyOverride('DisableExecuteApiEndpoint','true')


        api.root.addMethod('GET', undefined, {
            methodResponses,
        });

        const s3proxy = api.root.addResource('{proxy+}',);
        s3proxy.addMethod('GET', new apigateway.AwsIntegration({
            service: 's3',
            integrationHttpMethod: 'GET',
            path: `${bucket.bucketName}/{objkey}`,
            options: {
                credentialsRole: role,
                requestParameters: {
                    'integration.request.path.objkey': 'method.request.path.proxy',
                },
                integrationResponses,
            },
        }), {
            requestParameters: {
                "method.request.path.proxy": true
            }, methodResponses: methodResponses
        });
        s3proxy.addMethod('PUT', new apigateway.AwsIntegration({
            service: 's3',
            integrationHttpMethod: 'PUT',
            path: `${bucket.bucketName}/{objkey}`,
            options: {
                credentialsRole: role,
                requestParameters: {
                    'integration.request.path.objkey': 'method.request.path.proxy',
                },
                integrationResponses,
            },
        }), {
            requestParameters: {
                "method.request.path.proxy": true
            },
            methodResponses: methodResponses
        })

        new cdk.CfnOutput(this, 'S3Bucket', {
            value: bucket.bucketName
        });
        new cdk.CfnOutput(this, 'PutURL', {
            value: `https://${api.restApiId}.execute-api.${this.region}.amazonaws.com/prod/${bucket.bucketName}`
        });
    }
}
