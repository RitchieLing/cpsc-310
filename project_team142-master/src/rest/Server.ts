import {Application, Request, Response} from "express";
const express = require("express");
import * as http from "http";
const cors = require("cors");
import * as fs from "fs-extra";
const path = require("path");
import InsightFacade from "../controller/InsightFacade";
// const fileUpload = require("express-fileupload");
import {InsightDataset, InsightDatasetKind, InsightError, NotFoundError} from "../controller/IInsightFacade";

export default class Server {
	private readonly port: number;
	private express: Application;
	private server: http.Server | undefined;
	private static controller: InsightFacade;

	constructor(port: number) {
		console.info(`Server::<init>( ${port} )`);
		this.port = port;
		this.express = express();
		Server.controller = new InsightFacade();

		this.registerMiddleware();
		this.registerRoutes();

		// NOTE: you can serve static frontend files in from your express server
		// by uncommenting the line below. This makes files in ./frontend/public
		// accessible at http://localhost:<port>/
		this.express.use(express.static("./frontend/build"));
	}

	/**
	 * Starts the server. Returns a promise that resolves if success. Promises are used
	 * here because starting the server takes some time and we want to know when it
	 * is done (and if it worked).
	 *
	 * @returns {Promise<void>}
	 */
	public start(): Promise<void> {
		return new Promise((resolve, reject) => {
			console.info("Server::start() - start");
			if (this.server !== undefined) {
				console.error("Server::start() - server already listening");
				reject();
			} else {
				this.server = this.express.listen(this.port, () => {
					console.info(`Server::start() - server listening on port: ${this.port}`);
					resolve();
				}).on("error", (err: Error) => {
					// catches errors in server start
					console.error(`Server::start() - server ERROR: ${err.message}`);
					reject(err);
				});
			}
		});
	}

	/**
	 * Stops the server. Again returns a promise so we know when the connections have
	 * actually been fully closed and the port has been released.
	 *
	 * @returns {Promise<void>}
	 */
	public stop(): Promise<void> {
		console.info("Server::stop()");
		return new Promise((resolve, reject) => {
			if (this.server === undefined) {
				console.error("Server::stop() - ERROR: server not started");
				reject();
			} else {
				this.server.close(() => {
					console.info("Server::stop() - server closed");
					resolve();
				});
			}
		});
	}

	// Registers middleware to parse request before passing them to request handlers
	private registerMiddleware() {
		// JSON parser must be place before raw parser because of wildcard matching done by raw parser below
		this.express.use(express.json({limit: "50mb"}));
		this.express.use(express.urlencoded({ extended: true, limit: "50mb", parameterLimit: 1000000}));
		// this.express.use(fileUpload({
		// 	limits: { fileSize: 50 * 1024 * 1024 },
		// 	// useTempFiles: true
		// }));
		this.express.use(express.raw({type: "application/*", limit: "10mb"}));

		// enable cors in request headers to allow cross-origin HTTP requests
		this.express.use(cors({origin: "*",}));
	}

	// Registers all request handlers to routes
	private registerRoutes() {
		// This is an example endpoint this you can invoke by accessing this URL in your browser:
		// http://localhost:4321/echo/hello
		this.express.get("/echo/:msg", Server.echo);

		// endpoints in InsightFacade
		this.express.put("/dataset/:id/:kind", Server.addDataset);
		this.express.delete("/dataset/:id", Server.removeDataset);
		this.express.get("/datasets", Server.listDatasets);
		this.express.post("/query", Server.performQuery);
	}

	// The next two methods handle the echo service.
	// These are almost certainly not the best place to put these, but are here for your reference.
	// By updating the Server.echo function pointer above, these methods can be easily moved.
	private static echo(req: Request, res: Response) {
		try {
			console.log(`Server::echo(..) - params: ${JSON.stringify(req.params)}`);
			const response = Server.performEcho(req.params.msg);
			res.status(200).json({result: response});
		} catch (err) {
			res.status(400).json({error: err});
		}
	}

	private static performEcho(msg: string): string {
		if (typeof msg !== "undefined" && msg !== null) {
			return `${msg}...${msg}`;
		} else {
			return "Message not provided";
		}
	}

	private static addDataset(req: Request, res: Response) {
		try {
			let content = Buffer.from(req.body).toString("base64");
			if (req.params.kind === "courses") {
				Server.controller.addDataset(req.params.id, content, InsightDatasetKind.Courses)
					.then((idList: string[]) => {
						res.status(200).json({result: idList});
					}).catch((err: Error) => {
						console.log(err);
						res.status(400).json({error: err.message});
					});
			} else if (req.params.kind === "rooms") {
				Server.controller.addDataset(req.params.id, content, InsightDatasetKind.Rooms)
					.then((idList: string[]) => {
						res.status(200).json({result: idList});
					}).catch((err: Error) => {
						res.status(400).json({error: err.message});
					});
			} else {
				res.status(400).json({error: "dataset kind must be either courses or rooms"});
			}
		} catch (err) {
			res.status(400).json({error: err});
		}
	}

	private static removeDataset(req: Request, res: Response) {
		try {
			Server.controller.removeDataset(req.params.id).then((removedId: string) => {
				res.status(200).json({result: removedId});
			}).catch((insightErr: InsightError) => {
				res.status(400).json({error: insightErr.message});
			}).catch((notFoundErr: NotFoundError) => {
				res.status(404).json({error: notFoundErr.message});
			});
		} catch (err) {
			res.status(400).json({error: err});
		}
	}

	private static listDatasets(req: Request, res: Response) {
		Server.controller.listDatasets().then((arr: InsightDataset[]) => {
			res.status(200).json({result: arr});
		});
	}

	private static performQuery(req: Request, res: Response) {
		try {
			Server.controller.performQuery(req.body).then((queryResult: any[]) => {
				res.status(200).json({result: queryResult});
			}).catch((insightErr: InsightError) => {
				res.status(400).json({error: insightErr.message});
			});
		} catch (err) {
			res.status(400).json({error: err});
		}
	}
}
