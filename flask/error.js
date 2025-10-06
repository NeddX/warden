const ErrType = {
    VALUE: "value error",
    NOT_FOUND: "i/o error",
    RUNTIME_ERROR: "runtime error",
};

function Ok(value) {
    return { ok: true, value };
}

function Err(err) {
    return { ok: false, err };
}

function is_ok(result) {
    return result.ok === true;
}

function is_err(result) {
    return !is_ok(result);
}

function unwrap(result) {
    if (is_ok(result)) {
        return result.value;
    }
    throw new Error('Tried unwrapping an ErrType Result');
}

module.exports = {
    ErrType,
    Ok,
    Err,
    is_ok,
    is_err,
    unwrap,
};
