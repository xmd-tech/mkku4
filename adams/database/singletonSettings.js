// Legacy databases can contain several rows for a global setting. PostgreSQL
// does not guarantee which row an unordered findOne() returns after an UPDATE.
// Keep the legacy rows, but consistently use the most recently saved one.
async function findSingleton(model, where = {}) {
    return model.findOne({ where, order: [['updatedAt', 'DESC'], ['id', 'DESC']] });
}

const initializations = new WeakMap();

async function createSingleton(model, defaults = {}) {
    // A fixed primary key prevents simultaneous first reads from creating
    // competing defaults. Share initialization within this process as well.
    if (initializations.has(model)) return initializations.get(model);
    // Use an atomic insert, not a findOrCreate transaction: SQLite shares one
    // connection and several settings tables can initialize in parallel.
    const pending = (async () => {
        try {
            return await model.create({ ...defaults, id: 1 });
        } catch (error) {
            if (error.name !== 'SequelizeUniqueConstraintError') throw error;
            const existing = await model.findByPk(1);
            if (!existing) throw error;
            return existing;
        }
    })();
    initializations.set(model, pending);
    try {
        return await pending;
    } finally {
        if (initializations.get(model) === pending) initializations.delete(model);
    }
}

module.exports = { findSingleton, createSingleton };
