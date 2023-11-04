exports.name = "exit";
exports.desc = "exit program";
exports.handler = (cmd, arg, line, lines, editLine) => {
    // Codes
    process.exit(arg.length > 1 ? Number(arg[1]) : 0)
};