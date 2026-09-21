extends RefCounted

# Append-only JSONL, which is option 1 of the carrying options in the event
# contract: one event per line, nothing rewritten, readable by anything.

var _path := ""


func open(path: String, truncate := false) -> bool:
	_path = path
	if truncate or not FileAccess.file_exists(path):
		var file := FileAccess.open(path, FileAccess.WRITE)
		if file == null:
			push_error("could not open the event log at " + path)
			return false
		file.close()
	return true


func append(event: Dictionary) -> bool:
	if _path == "":
		return false
	var file := FileAccess.open(_path, FileAccess.READ_WRITE)
	if file == null:
		push_error("could not append to the event log at " + _path)
		return false
	file.seek_end()
	file.store_line(JSON.stringify(event))
	file.close()
	return true


func path() -> String:
	return _path


func absolute_path() -> String:
	return ProjectSettings.globalize_path(_path)
