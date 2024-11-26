import { DynamoDBClient, GetItemCommand } from "@aws-sdk/client-dynamodb";
import type { APIGatewayProxyEvent } from "aws-lambda";

type MyAPIGatewayProxyEvent = APIGatewayProxyEvent & {
  queryStringParameters: {
    id: string;
  };
};

const client = new DynamoDBClient({});

export const handler = async (event: MyAPIGatewayProxyEvent): Promise<any> => {
  const id = event.queryStringParameters.id;

  const command = new GetItemCommand({
    TableName: process.env.TABLE_NAME,
    Key: {
      id: { S: id },
    },
  });

  try {
    const data = await client.send(command);
    return {
      statusCode: 200,
      body: JSON.stringify(data.Item),
    };
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      body: JSON.stringify(err),
    };
  }
};
