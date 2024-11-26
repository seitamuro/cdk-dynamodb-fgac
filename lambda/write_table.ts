import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import type { APIGatewayProxyEvent } from "aws-lambda";

type MyAPIGatewayProxyEvent = APIGatewayProxyEvent & {
  body: {
    id: string;
    text: string;
    role: string;
  };
};

const client = new DynamoDBClient({});

export const handler = async (event: MyAPIGatewayProxyEvent): Promise<any> => {
  console.log(event);

  const body = JSON.parse(event.body);
  const command = new PutItemCommand({
    TableName: process.env.TABLE_NAME,
    Item: {
      id: { S: body.id },
      text: { S: body.text },
      role: { S: body.role },
    },
  });

  try {
    const data = await client.send(command);
    return {
      statusCode: 200,
      body: JSON.stringify(data),
    };
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      body: JSON.stringify(err),
    };
  }
};
