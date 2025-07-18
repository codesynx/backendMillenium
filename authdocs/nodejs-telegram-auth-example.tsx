import { validate, parse, type InitDataParsed } from '@telegram-apps/init-data-node';
import express, {
  type ErrorRequestHandler,
  type RequestHandler,
  type Response,
} from 'express';

/**
 * Sets init data in the specified Response object.
 * @param res - Response object.
 * @param initData - init data.
 */
function setInitData(res: Response, initData: InitDataParsed): void {
  res.locals.initData = initData;
}

/**
 * Extracts init data from the Response object.
 * @param res - Response object.
 * @returns Init data stored in the Response object. Can return undefined in case,
 * the client is not authorized.
 */
function getInitData(res: Response): InitDataParsed | undefined {
  return res.locals.initData;
}

/**
 * Middleware which authorizes the external client.
 * @param req - Request object.
 * @param res - Response object.
 * @param next - function to call the next middleware.
 */
const authMiddleware: RequestHandler = (req, res, next) => {
  // We expect passing init data in the Authorization header in the following format:
  // <auth-type> <auth-data>
  // <auth-type> must be "tma", and <auth-data> is Telegram Mini Apps init data.
  const [authType, authData = ''] = (req.header('authorization') || '').split(' ');

  switch (authType) {
    case 'tma':
      try {
        // Validate init data.
        validate(authData, token, {
          // We consider init data sign valid for 1 hour from their creation moment.
          expiresIn: 3600,
        });

        // Parse init data. We will surely need it in the future.
        setInitData(res, parse(authData));
        return next();
      } catch (e) {
        return next(e);
      }
    // ... other authorization methods.
    default:
      return next(new Error('Unauthorized'));
  }
};

/**
 * Middleware which shows the user init data.
 * @param _req
 * @param res - Response object.
 * @param next - function to call the next middleware.
 */
const showInitDataMiddleware: RequestHandler = (_req, res, next) => {
  const initData = getInitData(res);
  if (!initData) {
    return next(new Error('Cant display init data as long as it was not found'));
  }
  res.json(initData);
};

/**
 * Middleware which displays the user init data.
 * @param err - handled error.
 * @param _req
 * @param res - Response object.
 */
const defaultErrorMiddleware: ErrorRequestHandler = (err, _req, res) => {
  res.status(500).json({
    error: err.message,
  });
};

// Your secret bot token.
const token = '1234567890:ABC';

// Create an Express applet and start listening to port 3000.
const app = express();

app.use(authMiddleware);
app.get('/', showInitDataMiddleware);
app.use(defaultErrorMiddleware);

app.listen(3000);

// After the HTTP server was launched, try sending an HTTP GET request to the URL 
// http://localhost:3000/ with an Authorization header containing data in the required format.