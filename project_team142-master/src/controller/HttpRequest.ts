const http = require("http");
const host = "http://cs310.students.cs.ubc.ca";
const port = 11316;
const requestPath = "/api/v1/project_team142/";

export default function httpRequest(address: string): Promise<any> {
	return new Promise((resolve, reject) => {
		const url = host + ":" + port + requestPath + encodeURIComponent(address);
		const req = http.get(url, (res: any) => {
			if (res.statusCode < 200 || res.statusCode >= 300) {
				return reject(new Error("statusCode=" + res.statusCode));
			}
			let body: any = [];
			res.on("data", function(chunk: any) {
				body.push(chunk);
			});
			res.on("end", function() {
				try {
					body = JSON.parse(Buffer.concat(body).toString());
				} catch (e) {
					reject(e);
				}
				resolve(body);
			});
		});
		req.on("error", (e: Error) => {
			reject(e.message);
		});
		req.end();
	});
}
