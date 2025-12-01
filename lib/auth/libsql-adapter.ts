import type { Client } from "@libsql/client";
import type { Adapter, Where } from "better-auth";

/**
 * Custom Better Auth adapter for libSQL/Turso
 * Uses raw SQL queries with the @libsql/client
 */
export function libsqlAdapter(client: Client): Adapter {
  return {
    async create({ model, data }) {
      const columns = Object.keys(data);
      const values = Object.values(data);
      const placeholders = columns.map(() => "?").join(", ");

      const sql = `INSERT INTO ${model} (${columns.join(", ")}) VALUES (${placeholders})`;

      await client.execute({
        sql,
        args: values,
      });

      return data as any;
    },

    async findOne({ model, where }) {
      const { sql, args } = buildWhere(model, where);
      const result = await client.execute({ sql, args });
      return result.rows[0] as any;
    },

    async findMany({ model, where, limit, offset, sortBy }) {
      let sql = `SELECT * FROM ${model}`;
      let args: any[] = [];

      if (where) {
        const whereClause = buildWhere(model, where);
        sql += ` WHERE ${whereClause.sql.split("WHERE")[1]}`;
        args = whereClause.args;
      }

      if (sortBy) {
        const orderFields = Object.entries(sortBy)
          .map(([field, direction]) => `${field} ${direction}`)
          .join(", ");
        sql += ` ORDER BY ${orderFields}`;
      }

      if (limit) {
        sql += ` LIMIT ${limit}`;
      }

      if (offset) {
        sql += ` OFFSET ${offset}`;
      }

      const result = await client.execute({ sql, args });
      return result.rows as any[];
    },

    async update({ model, where, update }) {
      const setColumns = Object.keys(update);
      const setValues = Object.values(update);
      const setClause = setColumns.map((col) => `${col} = ?`).join(", ");

      const whereClause = buildWhere(model, where);
      const sql = `UPDATE ${model} SET ${setClause} WHERE ${whereClause.sql.split("WHERE")[1]}`;
      const args = [...setValues, ...whereClause.args];

      await client.execute({ sql, args });

      // Return the updated record
      return this.findOne!({ model, where });
    },

    async delete({ model, where }) {
      const whereClause = buildWhere(model, where);
      const sql = `DELETE FROM ${model} WHERE ${whereClause.sql.split("WHERE")[1]}`;
      await client.execute({ sql, args: whereClause.args });
    },

    async deleteMany({ model, where }) {
      const whereClause = buildWhere(model, where);
      const sql = `DELETE FROM ${model} WHERE ${whereClause.sql.split("WHERE")[1]}`;
      const result = await client.execute({ sql, args: whereClause.args });
      return result.rowsAffected || 0;
    },

    async count({ model, where }) {
      let sql = `SELECT COUNT(*) as count FROM ${model}`;
      let args: any[] = [];

      if (where) {
        const whereClause = buildWhere(model, where);
        sql += ` WHERE ${whereClause.sql.split("WHERE")[1]}`;
        args = whereClause.args;
      }

      const result = await client.execute({ sql, args });
      return (result.rows[0] as any).count || 0;
    },

    async updateMany({ model, where, update }) {
      const setColumns = Object.keys(update);
      const setValues = Object.values(update);
      const setClause = setColumns.map((col) => `${col} = ?`).join(", ");

      const whereClause = buildWhere(model, where);
      const sql = `UPDATE ${model} SET ${setClause} WHERE ${whereClause.sql.split("WHERE")[1]}`;
      const args = [...setValues, ...whereClause.args];

      const result = await client.execute({ sql, args });
      return result.rowsAffected || 0;
    },

    // Simple ID generation for Better Auth
    id: "custom-libsql-adapter",

    // Transaction support - simplified for now
    // LibSQL/Turso supports transactions but we'll execute without transaction wrapper
    async transaction(callback) {
      return await callback(this);
    },
  };
}

/**
 * Build WHERE clause from Better Auth where object
 */
function buildWhere(model: string, where: Where[]): { sql: string; args: any[] } {
  const conditions: string[] = [];
  const args: any[] = [];

  for (const condition of where) {
    const { field, value, operator = "eq" } = condition;

    switch (operator) {
      case "eq":
        conditions.push(`${field} = ?`);
        args.push(value);
        break;
      case "ne":
        conditions.push(`${field} != ?`);
        args.push(value);
        break;
      case "lt":
        conditions.push(`${field} < ?`);
        args.push(value);
        break;
      case "lte":
        conditions.push(`${field} <= ?`);
        args.push(value);
        break;
      case "gt":
        conditions.push(`${field} > ?`);
        args.push(value);
        break;
      case "gte":
        conditions.push(`${field} >= ?`);
        args.push(value);
        break;
      case "in":
        const placeholders = Array.isArray(value)
          ? value.map(() => "?").join(", ")
          : "?";
        conditions.push(`${field} IN (${placeholders})`);
        if (Array.isArray(value)) {
          args.push(...value);
        } else {
          args.push(value);
        }
        break;
      case "contains":
        conditions.push(`${field} LIKE ?`);
        args.push(`%${value}%`);
        break;
    }
  }

  const sql = `SELECT * FROM ${model} WHERE ${conditions.join(" AND ")}`;
  return { sql, args };
}
