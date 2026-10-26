import { Router, type IRouter } from "express";
import cors from "cors";
import healthRouter from "./health";
import identityRouter from "./identities";
import solanaRouter from "./solana";
import tokenRouter from "./tokens";
import walletRouter from "./wallet";

const router: IRouter = Router();

router.use(
  "/v1",
  cors({
    origin: "*",
    methods: ["GET", "OPTIONS"],
    allowedHeaders: ["content-type"],
    maxAge: 600,
  }),
);
router.use(healthRouter);
router.use(solanaRouter);
router.use(walletRouter);
router.use(identityRouter);
router.use(tokenRouter);

export default router;
