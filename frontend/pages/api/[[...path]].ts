/* eslint-disable @typescript-eslint/no-require-imports */
import type { NextApiRequest, NextApiResponse } from 'next';

export const config = {
  api: {
    bodyParser: false,
    externalResolver: true,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { getCachedNestServer } = await import('first-faith-backend');
  const server = await getCachedNestServer();
  return server(req, res);
}
