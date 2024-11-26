import * as cdk from "aws-cdk-lib";
import * as apigw from "aws-cdk-lib/aws-apigateway";
import * as ddb from "aws-cdk-lib/aws-dynamodb";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from "constructs";
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class CdkDynamodbFgacStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // テーブルの定義
    const table = new ddb.Table(this, "Table", {
      partitionKey: { name: "id", type: ddb.AttributeType.STRING },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Lambda関数の定義
    const writeLambdaFunction = new NodejsFunction(
      this,
      "WriteLambdaFunction",
      {
        entry: "lambda/write_table.ts",
        handler: "handler",
        runtime: lambda.Runtime.NODEJS_20_X,
        environment: {
          TABLE_NAME: table.tableName,
        },
      }
    );
    table.grantReadWriteData(writeLambdaFunction);

    const readDynamoDBAdminPolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ["dynamodb:GetItem"],
      resources: [table.tableArn],
    });
    readDynamoDBAdminPolicy.addCondition("ForAllValues:StringEquals", {
      "dynamodb:LeadingKeys": ["admin"],
    });
    const readLambdaFunctionAdmin = new NodejsFunction(
      this,
      "ReadLambdaFunctionAdmin",
      {
        entry: "lambda/read_table.ts",
        handler: "handler",
        runtime: lambda.Runtime.NODEJS_20_X,
        environment: {
          TABLE_NAME: table.tableName,
        },
      }
    );
    readLambdaFunctionAdmin.addToRolePolicy(readDynamoDBAdminPolicy);

    const readDynamoDBUserPolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ["dynamodb:GetItem"],
      resources: [table.tableArn],
    });
    readDynamoDBUserPolicy.addCondition("ForAllValues:StringEquals", {
      "dynamodb:LeadingKeys": ["user"],
    });
    readDynamoDBUserPolicy.addCondition("StringEquals", {
      "dynamodb:Select": ["SPECIFIC_ATTRIBUTES"],
    });
    const readLambdaFunctionUser = new NodejsFunction(
      this,
      "ReadLambdaFunctionUser",
      {
        entry: "lambda/read_table.ts",
        handler: "handler",
        runtime: lambda.Runtime.NODEJS_20_X,
        environment: {
          TABLE_NAME: table.tableName,
        },
      }
    );
    readLambdaFunctionUser.addToRolePolicy(readDynamoDBUserPolicy);

    // APIの作成
    const api = new apigw.RestApi(this, "Api", {
      deploy: true,
      defaultCorsPreflightOptions: {
        allowOrigins: apigw.Cors.ALL_ORIGINS,
        allowMethods: apigw.Cors.ALL_METHODS,
      },
    });
    const writeResource = api.root.addResource("write");
    writeResource.addMethod(
      "POST",
      new apigw.LambdaIntegration(writeLambdaFunction)
    );
    const readResource = api.root.addResource("read");
    const readAdminResource = readResource.addResource("admin");
    readAdminResource.addMethod(
      "GET",
      new apigw.LambdaIntegration(readLambdaFunctionAdmin)
    );
    const readUserResource = readResource.addResource("user");
    readUserResource.addMethod(
      "GET",
      new apigw.LambdaIntegration(readLambdaFunctionUser)
    );

    new cdk.CfnOutput(this, "ApiUrl", {
      value: api.url ?? "Something went wrong with the deploy",
    });
  }
}
