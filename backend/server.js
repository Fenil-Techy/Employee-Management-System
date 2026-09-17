import express from 'express'
import { pool } from './db.js'
import cors from 'cors'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'
import { authMiddleware } from './middleware/authMiddleware.js'
import { roleMiddleware } from './middleware/roleMiddeware.js'

const app = express()
const port = 3000

app.use(cors())
app.use(express.json())

app.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body
        const getEmployee = await pool.query(`
            select
            employees.id,
            employees.first_name,
            employees.email,
            employees.status,
            user_accounts.password,
            roles.name as role
             from user_accounts
             join employees
              on user_accounts.employee_id=employees.id
             join roles
              on employees.role_id=roles.id
             where employees.email=$1`, [email])
        if (getEmployee.rows.length === 0) {
            return res.status(401).send({ "error": "Invalid email or password" })
        }
        if (getEmployee.rows[0].status === "disabled") {
            return res.status(403).send({ "error": "Your account is disabled" })
        }
        const storedPassword = getEmployee.rows[0].password
        const matchPassword = await bcrypt.compare(password, storedPassword)

        if (!matchPassword) {
            return res.status(401).send({
                error: "Invalid email or password"
            })
        }

        const token = jwt.sign({ "name": getEmployee.rows[0].first_name, "id": getEmployee.rows[0].id, "role": getEmployee.rows[0].role }, process.env.JWT_SECRET, { expiresIn: "1h" })
        return res.status(200).send({ "message": "Login success", "role": getEmployee.rows[0].role, token })
    } catch (error) {
        return res.status(500).send("Internal server error")
    }

})


app.get("/profile", authMiddleware, async (req, res) => {
    try {
        const empId = req.user.id;
        const result = await pool.query(`
            select 
            e.id,
            e.first_name,
            e.last_name,
            e.email,
            r.name as role,
            des.name as designation,
            d.name as department
            from employees as e
            left join roles r on e.role_id=r.id
            left join designations des on e.designation_id=des.id
            left join departments d on e.department_id=d.id
            where e.id=$1
        `, [empId]);

        if (result.rows.length > 0) {
            const emp = result.rows[0];
            const fullName = `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || emp.first_name || req.user.name;
            return res.status(200).send({
                user: {
                    ...req.user,
                    ...emp,
                    name: fullName
                }
            });
        }
        return res.status(200).send({ user: req.user });
    } catch (error) {
        console.error(error);
        return res.status(200).send({ user: req.user });
    }
});
app.put("/edit-profile", authMiddleware, async (req, res) => {
    try {
        const empId = req.user.id
        const { first_name, last_name, email } = req.body
        const result = await pool.query(`
            update employees set first_name=$1,last_name=$2,email=$3 where id=$4 returning first_name,last_name,email
            `, [first_name, last_name, email, empId])
        return res.status(200).send({ message: "Profile updated successfully" })
    } catch (error) {
        console.error(error);
        return res.status(500).send({ error: "Internal server error" });
    }
})
app.put("/password-reset", authMiddleware, async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body;
        const empId = req.user.id;
        const result = await pool.query(`
            select a.password from user_accounts as a 
            where a.employee_id=$1
            `, [empId]);

        if (result.rows.length > 0) {
            const storedPassword = result.rows[0].password;
            const isCurrentPassword = await bcrypt.compare(oldPassword, storedPassword);
            if (!isCurrentPassword) {
                return res.status(400).send({ error: "Current password does not match" });
            }
            const hashedPassword = await bcrypt.hash(newPassword, 10);
            await pool.query(`
                update user_accounts set password=$1 where employee_id=$2
                `, [hashedPassword, empId]);
            return res.status(200).send({ message: "Password updated successfully" });
        } else {
            return res.status(404).send({ error: "User account not found" });
        }
    } catch (error) {
        console.error(error);
        return res.status(500).send({ error: "Internal server error" });
    }
});

app.get("/employees", authMiddleware, roleMiddleware("admin"), async (req, res) => {
    try {
        const result = await pool.query(
            `select 
            e.id,
            e.first_name,
            e.last_name,
            e.email,
            e.status,
            e.joining_date,
            r.name as role,
            des.name as designation,
            d.name as department
            from employees as e
            join roles r
            on e.role_id=r.id
            join designations des
            on e.designation_id=des.id
            join departments d
            on e.department_id=d.id
            order by e.id
            `
        )

        res.status(200).send(result.rows)

    } catch (error) {
        console.error(error)
        return res.status(500).send("Internal server error")
    }
})
app.get("/employees/:id", authMiddleware, roleMiddleware("admin"), async (req, res) => {
    try {
        const empId = req.params.id
        const result = await pool.query(`
            select 
            e.id,
            e.first_name,
            e.last_name,
            e.email,
            e.joining_date,
            r.name as role,
            des.name as designation,
            d.name as department
            from employees as e
            join roles r
            on e.role_id=r.id
            join designations des
            on e.designation_id=des.id
            join departments d
            on e.department_id=d.id
            where e.id=$1
            `, [empId])
        if (result.rows.length === 0) {
            return res.status(404).send("Employee not found")
        }
        return res.status(200).send(result.rows)

    } catch (error) {
        console.error(error)
        return res.status(500).send("Internal server error")
    }
})

app.post("/employees", authMiddleware, roleMiddleware("admin"), async (req, res) => {

    const client = await pool.connect();

    try {

        const {
            first_name,
            last_name,
            email,
            role,
            designation,
            department,
            password,
            status,
            joining_date
        } = req.body;

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Start transaction
        await client.query("BEGIN");

        // Create employee
        const result = await client.query(`
            INSERT INTO employees (
                first_name,
                last_name,
                email,
                role_id,
                designation_id,
                department_id,
                status,
                joining_date
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING
                id,
                first_name,
                last_name,
                email,
                status,
                role_id,
                designation_id,
                department_id,
                created_at,
                joining_date
        `, [
            first_name,
            last_name,
            email,
            role,
            designation,
            department,
            status || 'active',
            joining_date
        ]);

        // Create login account
        await client.query(`
            INSERT INTO user_accounts (
                employee_id,
                password
            )
            VALUES ($1, $2)
        `, [
            result.rows[0].id,
            hashedPassword
        ]);

        // Everything succeeded
        await client.query("COMMIT");

        res.status(201).send({
            message: "Employee created successfully",
            employee: result.rows[0]
        });

    } catch (error) {

        // Something failed → undo everything
        await client.query("ROLLBACK");

        console.error(error);

        return res.status(500).send({
            error: "Internal server error"
        });

    } finally {

        // Always return connection to pool
        client.release();

    }
});

app.put("/employees/:id", authMiddleware, roleMiddleware("admin"), async (req, res) => {
    try {
        const empId = req.params.id
        const { first_name, last_name, email, role, designation, department, status } = req.body
        const findemp = await pool.query("select id from employees where id=$1", [empId])
        if (findemp.rows.length === 0) {
            return res.status(404).send("Employee not found")
        }

        const result = await pool.query(
            `
            update employees
            set first_name=$1, last_name=$2, email=$3, role_id=$4, designation_id=$5, department_id=$6, status=$7 where id=$8
            returning id, first_name, last_name, email, status, role_id, designation_id, department_id, created_at`,
            [first_name, last_name, email, role, designation, department, status || 'active', empId]

        )
        return res.status(200).send({
            message: "Employee updated successfully",
            employee: result.rows[0]
        })

    } catch (error) {
        console.error(error)
        return res.status(500).send("Internal server error")
    }
})
app.delete("/employees/:id", authMiddleware, roleMiddleware("admin"), async (req, res) => {

    const client = await pool.connect();

    try {

        const { id } = req.params;

        await client.query("BEGIN");

        // Delete login account first
        await client.query(`
            DELETE FROM user_accounts
            WHERE employee_id = $1
        `, [id]);

        // Delete employee
        const result = await client.query(`
            DELETE FROM employees
            WHERE id = $1
            RETURNING id
        `, [id]);

        if (result.rows.length === 0) {
            await client.query("ROLLBACK");

            return res.status(404).send({
                error: "Employee not found"
            });
        }

        await client.query("COMMIT");

        return res.status(200).send({
            message: "Employee deleted successfully"
        });

    } catch (error) {

        await client.query("ROLLBACK");

        console.error(error);

        return res.status(500).send({
            error: "Internal server error"
        });

    } finally {

        client.release();

    }
});

//designations api

app.get("/designations", authMiddleware, roleMiddleware("admin"), async (req, res) => {
    try {

        const result = await pool.query(`
            SELECT designations.id, designations.name, count(employees.designation_id) as employees_count
            FROM designations left join employees 
            on designations.id=employees.designation_id
            group by designations.id,designations.name
            order by designations.id
        `);

        return res.status(200).send(result.rows);

    } catch (error) {

        console.error(error);

        return res.status(500).send({
            error: "Internal server error"
        });

    }
});

app.post("/designations", authMiddleware, roleMiddleware("admin"), async (req, res) => {
    try {

        const { name } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).send({
                error: "Designation name is required"
            });
        }

        const result = await pool.query(`
            INSERT INTO designations (name)
            VALUES ($1)
            RETURNING id, name
        `, [name.trim()]);

        return res.status(201).send({
            message: "Designation created successfully",
            designation: result.rows[0]
        });

    } catch (error) {

        console.error(error);

        if (error.code === "23505") {
            return res.status(409).send({
                error: "Designation already exists"
            });
        }

        return res.status(500).send({
            error: "Internal server error"
        });

    }
});

app.put("/designations/:id", authMiddleware, roleMiddleware("admin"), async (req, res) => {
    try {

        const { id } = req.params;
        const { name } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).send({
                error: "Designation name is required"
            });
        }

        const result = await pool.query(`
            UPDATE designations
            SET name = $1
            WHERE id = $2
            RETURNING id, name
        `, [name.trim(), id]);

        if (result.rows.length === 0) {
            return res.status(404).send({
                error: "Designation not found"
            });
        }

        return res.status(200).send({
            message: "Designation updated successfully",
            designation: result.rows[0]
        });

    } catch (error) {

        console.error(error);

        if (error.code === "23505") {
            return res.status(409).send({
                error: "Designation already exists"
            });
        }

        return res.status(500).send({
            error: "Internal server error"
        });

    }
});

app.delete("/designations/:id", authMiddleware, roleMiddleware("admin"), async (req, res) => {
    try {

        const { id } = req.params;

        const result = await pool.query(`
            DELETE FROM designations
            WHERE id = $1
            RETURNING id, name
        `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).send({
                error: "Designation not found"
            });
        }

        return res.status(200).send({
            message: "Designation deleted successfully"
        });

    } catch (error) {

        console.error(error);

        if (error.code === "23503") {
            return res.status(409).send({
                error: "Designation cannot be deleted because employees are assigned to it"
            });
        }

        return res.status(500).send({
            error: "Internal server error"
        });

    }
});

//departments

app.get("/departments", authMiddleware, roleMiddleware("admin"), async (req, res) => {
    try {

        const result = await pool.query(`
            SELECT departments.id, departments.name,count(employees.department_id) as employees_count
            FROM departments left join employees
            on departments.id=employees.department_id
            group by departments.id,departments.name
            ORDER BY departments.id
        `);

        return res.status(200).send(result.rows);

    } catch (error) {

        console.error(error);

        return res.status(500).send({
            error: "Internal server error"
        });

    }
});

app.post("/departments", authMiddleware, roleMiddleware("admin"), async (req, res) => {
    try {

        const { name } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).send({
                error: "Department name is required"
            });
        }

        const result = await pool.query(`
            INSERT INTO departments (name)
            VALUES ($1)
            RETURNING id, name
        `, [name.trim()]);

        return res.status(201).send({
            message: "Department created successfully",
            department: result.rows[0]
        });

    } catch (error) {

        console.error(error);

        if (error.code === "23505") {
            return res.status(409).send({
                error: "Department already exists"
            });
        }

        return res.status(500).send({
            error: "Internal server error"
        });

    }
});

app.put("/departments/:id", authMiddleware, roleMiddleware("admin"), async (req, res) => {
    try {

        const { id } = req.params;
        const { name } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).send({
                error: "Department name is required"
            });
        }

        const result = await pool.query(`
            UPDATE departments
            SET name = $1
            WHERE id = $2
            RETURNING id, name
        `, [name.trim(), id]);

        if (result.rows.length === 0) {
            return res.status(404).send({
                error: "Department not found"
            });
        }

        return res.status(200).send({
            message: "Department updated successfully",
            department: result.rows[0]
        });

    } catch (error) {

        console.error(error);

        if (error.code === "23505") {
            return res.status(409).send({
                error: "Department already exists"
            });
        }

        return res.status(500).send({
            error: "Internal server error"
        });

    }
});

app.delete("/departments/:id", authMiddleware, roleMiddleware("admin"), async (req, res) => {
    try {

        const { id } = req.params;

        const result = await pool.query(`
            DELETE FROM departments
            WHERE id = $1
            RETURNING id, name
        `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).send({
                error: "Department not found"
            });
        }

        return res.status(200).send({
            message: "Department deleted successfully"
        });

    } catch (error) {

        console.error(error);

        if (error.code === "23503") {
            return res.status(409).send({
                error: "Department cannot be deleted because employees are assigned to it"
            });
        }

        return res.status(500).send({
            error: "Internal server error"
        });

    }
});

app.get("/leave-types", authMiddleware, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT id, name, annual_days
            FROM leave_types
            ORDER BY id
        `);

        return res.status(200).send(result.rows);

    } catch (error) {
        console.error(error);
        return res.status(500).send({
            error: "Internal server error"
        });
    }
});
app.post("/leave-types", authMiddleware, roleMiddleware('admin'), async (req, res) => {
    try {
        const { name, days } = req.body
        const result = await pool.query(`
            insert into leave_types(name,annual_days) values($1,$2)
        `, [name, days]);

        return res.status(200).send({ message: "new leave added successfully" });

    } catch (error) {
        console.error(error);
        return res.status(500).send({
            error: "Internal server error"
        });
    }
});
app.put("/leave-types/:id", authMiddleware, roleMiddleware('admin'), async (req, res) => {
    try {
        const id = req.params.id
        const { days } = req.body
        const result = await pool.query(`
            update leave_types set annual_days=$1 where id=$2
        `, [days, id]);

        return res.status(200).send({ message: "leaves updated successfully" });

    } catch (error) {
        console.error(error);
        return res.status(500).send({
            error: "Internal server error"
        });
    }
});

app.delete("/leave-types/:id", authMiddleware, roleMiddleware('admin'), async (req, res) => {
    try {
        const id = req.params.id;
        const result = await pool.query(`
            DELETE FROM leave_types WHERE id = $1 RETURNING id, name
        `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).send({ error: "Leave type not found" });
        }

        return res.status(200).send({ message: "Leave type deleted successfully" });

    } catch (error) {
        console.error(error);
        if (error.code === "23503") {
            return res.status(409).send({ error: "Leave type cannot be deleted because leave applications are linked to it" });
        }
        return res.status(500).send({ error: "Internal server error" });
    }
});

app.post("/leave-requests", authMiddleware, async (req, res) => {
    try {
        const {
            leave_type_id,
            start_date,
            end_date,
            reason
        } = req.body;

        const employee_id = req.user.id;

        if (!leave_type_id || !start_date || !end_date) {
            return res.status(400).send({
                error: "Leave type, start date and end date are required"
            });
        }

        if (new Date(end_date) < new Date(start_date)) {
            return res.status(400).send({
                error: "End date cannot be before start date"
            });
        }

        const result = await pool.query(`
            INSERT INTO leave_requests (
                employee_id,
                leave_type_id,
                start_date,
                end_date,
                reason
            )
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `, [
            employee_id,
            leave_type_id,
            start_date,
            end_date,
            reason || null
        ]);

        return res.status(201).send({
            message: "Leave request submitted successfully",
            leave_request: result.rows[0]
        });

    } catch (error) {
        console.error(error);

        return res.status(500).send({
            error: "Internal server error"
        });
    }
});

app.get("/my-leave-requests", authMiddleware, roleMiddleware('employee'), async (req, res) => {
    try {
        const employee_id = req.user.id;
        const result = await pool.query(`
            SELECT 
                lr.id,
                lr.employee_id,
                lr.leave_type_id,
                lt.name as leave_type_name,
                lr.start_date,
                lr.end_date,
                lr.reason,
                COALESCE(lr.status, 'pending') as status,
                lr.created_at
            FROM leave_requests lr
            LEFT JOIN leave_types lt ON lr.leave_type_id = lt.id
            WHERE lr.employee_id = $1
            ORDER BY lr.created_at DESC, lr.id DESC
        `, [employee_id]);

        return res.status(200).send(result.rows);
    } catch (error) {
        console.error(error);
        return res.status(500).send({ error: "Internal server error" });
    }
});
app.get("/leave-requests", authMiddleware, roleMiddleware("admin"), async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                lr.id,
                lr.employee_id,
                e.first_name,
                e.last_name,
                lt.name AS leave_type_name,
                lr.start_date,
                lr.end_date,
                lr.reason,
                lr.status,
                lr.admin_comment,
                lr.created_at
            FROM leave_requests AS lr
            LEFT JOIN employees AS e
                ON e.id = lr.employee_id
            LEFT JOIN leave_types AS lt
                ON lt.id = lr.leave_type_id
            ORDER BY lr.created_at DESC
        `);

        return res.status(200).send(result.rows);

    } catch (error) {
        console.error(error);

        return res.status(500).send({
            error: "Internal server error"
        });
    }
});

app.put("/leave-requests/:id/status", authMiddleware, roleMiddleware("admin"), async (req, res) => {
    try {
        const id = req.params.id;
        const { status, admin_comment } = req.body;

        if (!status || !['approved', 'rejected', 'pending'].includes(status)) {
            return res.status(400).send({ error: "Valid status ('approved', 'rejected', or 'pending') is required" });
        }

        const result = await pool.query(`
            UPDATE leave_requests
            SET status = $1, admin_comment = $2
            WHERE id = $3
            RETURNING *
        `, [status, admin_comment || null, id]);

        if (result.rows.length === 0) {
            return res.status(404).send({ error: "Leave request not found" });
        }

        return res.status(200).send({
            message: `Leave request ${status} successfully`,
            leave_request: result.rows[0]
        });

    } catch (error) {
        console.error(error);
        return res.status(500).send({ error: "Internal server error" });
    }
});

app.get("/leave-balance", authMiddleware, async (req, res) => {
    try {
        const employeeId = req.user.id;

        // Get employee joining date
        const employeeResult = await pool.query(
            `
      SELECT joining_date
      FROM employees
      WHERE id = $1
      `,
            [employeeId]
        );

        if (employeeResult.rows.length === 0) {
            return res.status(404).send({
                error: "Employee not found"
            });
        }

        const joiningDate = employeeResult.rows[0].joining_date;

        if (!joiningDate) {
            return res.status(400).send({
                error: "Joining date is not available"
            });
        }

        // Current year
        const currentYear = new Date().getFullYear();

        // Joining year
        const joiningYear = new Date(joiningDate).getFullYear();

        let eligibleDays = 0;

        const startOfYear = new Date(currentYear, 0, 1);
        const endOfYear = new Date(currentYear, 11, 31);

        if (joiningYear < currentYear) {

            eligibleDays =
                Math.floor(
                    (endOfYear.getTime() - startOfYear.getTime()) /
                    (1000 * 60 * 60 * 24)
                ) + 1;

        } else if (joiningYear === currentYear) {

            const startDate = new Date(joiningDate);

            eligibleDays =
                Math.floor(
                    (endOfYear.getTime() - startDate.getTime()) /
                    (1000 * 60 * 60 * 24)
                ) + 1;
        }

        // Get leave types
        const leaveTypesResult = await pool.query(
            `
      SELECT id, name, annual_days
      FROM leave_types
      ORDER BY id
      `
        );

        const leaves = leaveTypesResult.rows.map((leave) => {

            const entitledDays = Math.round(
                (leave.annual_days / 365) * eligibleDays
            );

            return {
                id: leave.id,
                name: leave.name,
                annual_days: leave.annual_days,
                entitled_days: entitledDays
            };
        });

        const totalEntitled = leaves.reduce(
            (total, leave) => total + leave.entitled_days,
            0
        );

        return res.status(200).send({
            eligible_days: eligibleDays,
            total_entitled: totalEntitled,
            leaves
        });

    } catch (error) {
        console.error(error);

        return res.status(500).send({
            error: "Internal server error"
        });
    }
});

app.listen(port, () => {
    console.log(`server is running on port ${port}`)
})