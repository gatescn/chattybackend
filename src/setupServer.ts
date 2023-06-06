import { Application, json, urlencoded, Response, Request, NextFunction } from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import hpp from 'hpp';
import cookieSession from 'cookie-session';
import HTTP_STATUS from 'http-status-codes';
import { config } from './config';
import 'express-async-errors';
import compression from 'compression'; //helps compress request size
import { Server } from 'socket.io';
import { createClient } from 'redis';
import { createAdapter } from '@socket.io/redis-adapter';
import applicationRoutes from './routes';
import { CustomError, IErrorResponse } from './shared/globals/helpers/error-handler';
import Logger from 'bunyan';

const SERVER_PORT = 5000;
//react by defaut listens on port 3000 so we will use 5000 for the server and let the client use port 3000.
//will also use this on AWS (very important)
const log: Logger = config.createLogger('server');

export class ChattyServer {
  private app: Application; //used to create instance of expresss app

  constructor(app: Application) {
    this.app = app; //when we call chatty server, we create instance and pass express application instance.
    //we set the app to private var here.
  }

  public start(): void {
    this.securityMiddleware(this.app);
    this.standardMiddleware(this.app);
    this.routeMiddleware(this.app);
    this.globalErrorHandler(this.app);
    this.startServer(this.app);
  }

  private securityMiddleware(app: Application): void {
    //app.use calls middleware in express app
    app.use(
      //npm cookieSession, hpp and helmet
      cookieSession({
        name: 'session',
        keys: [config.SECRET_KEY_ONE!, config.SECRET_KEY_TWO!],
        maxAge: 24 * 7 * 3600000, // typically in milliseconds..
        //how long the cookie is valid for. If user makes request and cookie expired then request will fail. (7 days) after which if the user doesnt sign out and login again.
        secure: config.NODE_ENV !== 'development' //need to set to true when deploying.. (http) or https
      })
    );
    app.use(hpp());
    app.use(helmet());
    app.use(
      cors({
        origin: config.CLIENT_URL,
        credentials: true, //if not set to true and use cookies it might not work
        optionsSuccessStatus: 200,
        methods: ['GET', 'POST', 'DELETE', 'OPTIONS']
      })
    );
  }

  private standardMiddleware(app: Application): void {
    app.use(compression());
    app.use(
      json({
        //allows sending json data from server to client..
        limit: '50mb' //if request is bigger than 50mb, error is thrown
      })
    );
    app.use(
      urlencoded({
        //allows us to url encoded data from server to client
        extended: true,
        limit: '50mb' //if request is bigger than 50mb, error is thrown
      })
    );
  }

  private routeMiddleware(app: Application): void {
    applicationRoutes(app);
  }

  private globalErrorHandler(app: Application): void {
    //in express if you want to catch errors related to unavail urls, you can use app.all (asterick)
    app.all('*', (req: Request, res: Response) => {
      //middle ware to catch errors with urls that are unavailable.
      //use case: user makes request to endpoint that doesnt exist.
      //.json sends a json response
      //sending error message to client..
      res.status(HTTP_STATUS.NOT_FOUND).json({ message: req.originalUrl + ' not found' });
    });
    //catches custom errors
    //error is our custom error class
    app.use((error: IErrorResponse, _req: Request, res: Response, next: NextFunction) => {
      log.error(error); //see error in console
      //if it is a custom error
      if (error instanceof CustomError) {
        return res.status(error.statusCode).json(error.serializeErrors());
      }
      next(); //if no errors call next function
    });
  }

  private async startServer(app: Application): Promise<void> {
    try {
      const httpServer: http.Server = new http.Server(app);
      const socketIO: Server = await this.createSocketIO(httpServer);
      this.startHttpServer(httpServer);
      this.socketIOConnections(socketIO);
    } catch (error) {
      log.error(error);
    }
  } // async - methods will always return a promise

  private async createSocketIO(httpServer: http.Server): Promise<Server> {
    const io: Server = new Server(httpServer, {
      cors: {
        origin: config.CLIENT_URL,
        methods: ['GET', 'POST', 'DELETE', 'OPTIONS']
      }
    });
    const pubClient = createClient({
      url: config.REDIS_HOST
    });
    const subClient = pubClient.duplicate();
    await Promise.all([pubClient.connect(), subClient.connect()]);
    io.adapter(createAdapter(pubClient, subClient));
    return io;
  }

  private startHttpServer(httpServer: http.Server): void {
    log.info('Server has started with process ' + process.pid);
    httpServer.listen(SERVER_PORT, () => {
      log.info('Server running on port' + SERVER_PORT);
      // use log library on production.. more light weight..
    });
  }
  private socketIOConnections(io: Server): void {}
}
