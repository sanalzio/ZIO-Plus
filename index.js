const { default: axios } = require("axios");
const fs = require("fs");
const { join } = require("path");
const argvs = process.argv;
const commandfolder = "commands";
const keyfolder = "keys";
if (argvs.length >= 4 && argvs[2].toLowerCase() === "i") {
	const libname = argvs[3].replace(".", "/").replace(".", "/");
	axios
		.get(`https://raw.githubusercontent.com/${libname}/setup.zi`)
		.then((response) => {
			const setupzicon = response.data.split("\n");
			setupzicon.forEach((line) => {
				const tla = line.replace("\r", "").split(" ");
				if (tla.length > 1 && tla[0].toLowerCase() === "cmd") {
					let filename = tla[1];
					let simple = false;
					if (tla.length > 1 && tla[1].toLowerCase() == "-s") {
						filename = tla[2];
						simple = true;
					}
					axios
						.get(`https://raw.githubusercontent.com/${libname}/commands/${filename}`)
						.then((res) => {
							let cmdcon = res.data;
							if (simple) {
								cmdcon = `exports.name = "${
									res.data.split("\n")[0].split(" //")[0]
								}";\nexports.desc = "?";\nexports.handler = (cmd, arg, line, lines, editLine, definitions, points) => {\n${res.data
									.split("\n")
									.slice(1)
									.join("\n")}\n};`;
							}
							fs.writeFileSync(join(commandfolder, filename), cmdcon);
						});
				} else if (tla.length > 1 && tla[0].toLowerCase() === "key") {
					let filename = tla[1];
					let simple = false;
					if (tla.length > 1 && tla[1].toLowerCase() == "-s") {
						filename = tla[2];
						simple = true;
					}
					axios
						.get(`https://raw.githubusercontent.com/${libname}/keys/${filename}`)
						.then((res) => {
							let cmdcon = res.data;
							if (simple) {
								cmdcon = `exports.name = "${
									res.data.split("\n")[0]
								}";\nexports.desc = "?";\nexports.handler = (cmd, arg, line, lines, editLine, definitions, points) => {\n${res.data
									.split("\n")
									.slice(1)
									.join("\n")}\n};`;
							}
							fs.writeFileSync(join(keyfolder, filename), cmdcon);
						});
				} else if (tla.length > 1 && tla[0].toLowerCase() === "file") {
					axios
						.get(`https://raw.githubusercontent.com/${libname}/${tla[1]}`)
						.then((res) => {
							fs.writeFileSync(tla[1], res.data);
						});
				}
			});
		})
		.catch((error) => {
			console.error(error);
		});
} else if (argvs[2].toLowerCase().endsWith(".zi")) {
	// const { evaluate } = require("mathjs");
	const prompt = require("prompt-sync")();
	let filecon = fs.readFileSync(argvs[2], "utf-8");
	let lines = filecon.split("\n");

	let definitions = {};
	let points = {};
	let lastgoto = 0;
	let lastcondition = false;

	function sleep(ms) {
		var start = new Date().getTime();
		for (var i = 0; i < 1e7; i++) {
			if (new Date().getTime() - start > ms) {
				break;
			}
		}
	}

	function remtab(text) {
		let lines = text.split("\n");
		let stripped_lines = lines.map((line) => {
			return line.trimLeft();
		});
		return stripped_lines.join("\n");
	}
	for (let index = 0; index < lines.length; index++) {
		let line = lines[index].replace("\r", "");
		for (let key in definitions) {
			if (definitions.hasOwnProperty(key)) {
				// lines[index] = lines[index].replaceAll("${" + key + "}", definitions[key]);
				line = line.replaceAll("${" + key + "}", definitions[key]);
			}
		}
		if (line.startsWith("//")) {
			continue;
		}
		if (line.includes(" //")) {
			lines[index] = line.split(" //")[0];
			line = line.split(" //")[0];
		} else if (line.includes("//")) {
			lines[index] = line.split("//")[0];
			line = line.split("//")[0];
		}
		let arg = line.split(" ");
		let cmd = arg[0];
		function editLine(linecontent) {
			// lines[index] = linecontent;
			line = linecontent;
			arg = linecontent.split(" ");
			cmd = arg[0];
		}
		if (line.startsWith("  ") || line.startsWith("	")) {
			if (!lastcondition) {
				editLine("");
				continue;
			} else {
				editLine(remtab(line));
			}
		}
		if (line.includes("$[")) {
			for (let ind = 0; ind < arg.length; ind++) {
				const th = arg[ind];
				if (th.includes("$[")) {
					// let islem = evaluate(th.replace("$[", "").replace("]", ""));
					editLine(
						line.replace(
							arg[ind],
							eval(th.replace("$[", "").replace("]", "")).toString()
						)
					);
				}
			}
		}
		switch (cmd) {
			case "if":
				if (eval(arg.slice(1).join(" "))) {
					lastcondition = true;
				} else {
					lastcondition = false;
				}
				break;
			case "else":
				lastcondition = !lastcondition;
				break;
			case "define":
				definitions[arg[1]] = arg.slice(2).join(" ");
				break;
			case "randint":
				definitions[arg[1]] = (
					Math.floor(Math.random() * Number(arg[3])) + Number(arg[2])
				).toString();
				break;
			case "getinp":
				definitions[arg[1]] = prompt(arg.length < 3 ? "" : arg.slice(2).join(" "));
				break;
			case "point":
				points[arg[1]] = index;
				break;
			case "break":
				index = lastgoto;
				break;
			default:
				const keyFiles = fs
					.readdirSync(join(__dirname, keyfolder))
					.filter((file) => file.endsWith("_.js") && file.startsWith("_"));
				for (let ci = 0; ci < keyFiles.length; ci++) {
					const file = keyFiles[ci];
					const command = require(join(__dirname, keyfolder, `${file}`));
					if (command.name === cmd) {
						command.handler(cmd, arg, line, lines, editLine, definitions, points);
						break;
					}
				}
				break;
		}
		switch (cmd) {
			case "goto":
				lastgoto = index;
				index = points[arg[1]];
				break;
			case "echo":
				console.log(arg.slice(1).join(" "));
				break;
			case "delay":
				sleep(Number(arg[1]));
				break;
			case "quit":
				process.exit(0);
			default:
				const commandFiles = fs
					.readdirSync(join(__dirname, commandfolder))
					.filter((file) => file.endsWith(".js"));
				for (let ci = 0; ci < commandFiles.length; ci++) {
					const file = commandFiles[ci];
					const command = require(join(__dirname, commandfolder, `${file}`));
					if (command.name === cmd) {
						command.handler(cmd, arg, line, lines, editLine, definitions, points);
						break;
					}
				}
				break;
		}
	}
}
