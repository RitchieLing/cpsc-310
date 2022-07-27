const fs = require("fs-extra");

export default class FileReader {
	// private dirPath: string = "./data/buildings.json"
	private dirPath: string = "./data/";

	public writeData(name: string, dataList: any) {
		return new Promise((resolve, reject) => {
			fs.writeJson(this.dirPath + `${name}.json`, dataList, (err: any) => {
				if (err) {
					console.error(err);
					return reject(err);
				}
				return resolve(0);
			});
		});
	}

	public readData(name: string): Promise<any[]> {
		return new Promise((resolve, reject) => {
			fs.readJson(this.dirPath + `${name}.json`, (err: Error, obj: any) => {
				if (err) {
					console.error(err);
					return reject(err);
				}
				return resolve(obj);
			});
		});
	}
}
