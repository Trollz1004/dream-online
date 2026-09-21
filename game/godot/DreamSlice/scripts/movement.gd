extends RefCounted

# Which way is forward is decided by the camera, never by the way the character
# body happens to be turned. Looking left and pressing W moves the character the
# way the camera faces.
#
# Kept as a plain function with no node behind it so the rule can be tested
# headlessly and reused by anything that needs it.

static func camera_relative(input: Vector3, yaw: float) -> Vector3:
	var flat := Vector3(input.x, 0.0, input.z)
	if flat.length() < 0.0001:
		return Vector3.ZERO
	return (Basis(Vector3.UP, yaw) * flat.normalized()).normalized()
