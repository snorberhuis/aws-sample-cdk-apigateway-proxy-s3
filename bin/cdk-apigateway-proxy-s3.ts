#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { CdkApigatewayProxyS3Stack } from '../lib/cdk-apigateway-proxy-s3-stack';

const app = new cdk.App();
new CdkApigatewayProxyS3Stack(app, 'CdkApigatewayProxyS3Stack');
