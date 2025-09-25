export namespace development {
    let client: string;
    namespace connection {
        let host: string;
        let port: string | number;
        let database: string;
        let user: string;
        let password: string;
    }
    namespace pool {
        let min: number;
        let max: number;
    }
    namespace migrations {
        let tableName: string;
        let directory: string;
    }
    namespace seeds {
        let directory_1: string;
        export { directory_1 as directory };
    }
}
export namespace test {
    let client_1: string;
    export { client_1 as client };
    export namespace connection_1 {
        let host_1: string;
        export { host_1 as host };
        let port_1: string | number;
        export { port_1 as port };
        let database_1: string;
        export { database_1 as database };
        let user_1: string;
        export { user_1 as user };
        let password_1: string;
        export { password_1 as password };
    }
    export { connection_1 as connection };
    export namespace pool_1 {
        let min_1: number;
        export { min_1 as min };
        let max_1: number;
        export { max_1 as max };
    }
    export { pool_1 as pool };
    export namespace migrations_1 {
        let tableName_1: string;
        export { tableName_1 as tableName };
        let directory_2: string;
        export { directory_2 as directory };
    }
    export { migrations_1 as migrations };
    export namespace seeds_1 {
        let directory_3: string;
        export { directory_3 as directory };
    }
    export { seeds_1 as seeds };
}
export namespace staging {
    let client_2: string;
    export { client_2 as client };
    export namespace connection_2 {
        let host_2: string | undefined;
        export { host_2 as host };
        let port_2: string | undefined;
        export { port_2 as port };
        let database_2: string | undefined;
        export { database_2 as database };
        let user_2: string | undefined;
        export { user_2 as user };
        let password_2: string | undefined;
        export { password_2 as password };
    }
    export { connection_2 as connection };
    export namespace pool_2 {
        let min_2: number;
        export { min_2 as min };
        let max_2: number;
        export { max_2 as max };
    }
    export { pool_2 as pool };
    export namespace migrations_2 {
        let tableName_2: string;
        export { tableName_2 as tableName };
        let directory_4: string;
        export { directory_4 as directory };
    }
    export { migrations_2 as migrations };
    export namespace seeds_2 {
        let directory_5: string;
        export { directory_5 as directory };
    }
    export { seeds_2 as seeds };
}
export namespace production {
    let client_3: string;
    export { client_3 as client };
    let connection_3: string | {
        host: string | undefined;
        port: string | undefined;
        database: string | undefined;
        user: string | undefined;
        password: string | undefined;
        ssl: boolean | {
            rejectUnauthorized: boolean;
        };
    };
    export { connection_3 as connection };
    export namespace pool_3 {
        let min_3: number;
        export { min_3 as min };
        let max_3: number;
        export { max_3 as max };
    }
    export { pool_3 as pool };
    export namespace migrations_3 {
        let tableName_3: string;
        export { tableName_3 as tableName };
        let directory_6: string;
        export { directory_6 as directory };
    }
    export { migrations_3 as migrations };
    export namespace seeds_3 {
        let directory_7: string;
        export { directory_7 as directory };
    }
    export { seeds_3 as seeds };
}
//# sourceMappingURL=knexfile.d.ts.map