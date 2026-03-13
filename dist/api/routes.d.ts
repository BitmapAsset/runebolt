import { Router, Request, Response, NextFunction } from 'express';
import { RuneBolt } from '../core/RuneBolt';
export declare function createRouter(bolt: RuneBolt): Router;
export declare function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void;
//# sourceMappingURL=routes.d.ts.map