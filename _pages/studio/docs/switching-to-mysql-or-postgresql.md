---
title: "Switching to MySQL or PostgreSQL"
layout: guide
permalink: /studio/docs/switching-to-mysql-or-postgresql
slug: "switching-to-mysql-or-postgresql"
excerpt: "This article describes how to configure Apicurio Studio to use a different database."
hidden: false
guide: true
createdAt: "2017-07-18T14:58:38.948Z"
updatedAt: "2019-11-14T16:25:34.359Z"
---
By default, the Apicurio Studio quickstart is configured to use a simple (but persistent) H2 database.  Unless you are simply evaluating the software, you will likely want to switch to using an external database such as MySQL or PostgreSQL.

## 1. Install MySQL or PostgreSQL or Configure AzureSQL
Obviously the first step is to download and install [MySQL](https://www.mysql.com/) or [PostgreSQL](https://www.postgresql.org/) or configure AzureSQL database.  Installation and configuration of the database you choose is outside the scope of this article.

## 2. (optional) Install the Apicurio Studio DDL
Fire up your favorite SQL tool (for example if you're using MySQL then it's likely the MySQL Workbench) and use it to initialize your Apicurio Studio database with the appropriate DDL:

* [Download Apicurio Studio DDLs](https://github.com/Apicurio/apicurio-studio/tree/master/back-end/hub-core/src/main/resources/io/apicurio/hub/core/storage/jdbc)

> **Note: this step is optional**
>
> Apicurio Studio will initialize the database for you (using the proper DDL) on first startup.  However, database admins often do not grant sufficient privileges to the application's database user for this to work.  Typically database admins will install the DDL manually.

## 3. Configure Apicurio Studio to use your Database
Once the database is created (and optionally initialized) you will need to tell Apicurio Studio how to connect.  There are three main tasks you should be concerned with:

* Download & Deploy a Database Driver (MySQL or PostgreSQL or AzureSQL driver)
* Database connection (a DataSource configured in standalone.xml)
* Database **type** (configured as a system property or environment variable)

Let's go through each of these in turn.

### 3.1. Download & Deploy a Database Driver
In order for Apicurio Studio to connect to your database, you will need to install an appropriate JDBC driver.

* Download [MySQL Driver](https://dev.mysql.com/downloads/connector/j/)
* Download [PostgreSQL Driver](https://jdbc.postgresql.org/download.html)
* Download [AzureSQL Driver](https://go.microsoft.com/fwlink/?linkid=2155948)

Once downloaded, extract the package (if necessary) and then copy the JDBC driver .jar file to the following location:

```shell
APICURIO_INSTALL_DIR/standalone/deployments
```

### 3.2. Database Connection
The Apicurio Studio Quickstart comes with a default DataSource configured in the **standalone-apicurio.xml** configuration file.  You will need to replace that DataSource with one specific to your database.  Find and remove the following markup from **standalone-apicurio.xml**:

```xml
<datasource jndi-name="java:jboss/datasources/ApicurioDS" pool-name="ApicurioDS" 
            enabled="true" use-java-context="true">
  <connection-url>jdbc:h2:mem:apicurio;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE</connection-url>
  <driver>h2</driver>
  <security>
    <user-name>sa</user-name>
    <password>sa</password>
  </security>
</datasource>
```

Replace the above with a DataSource configured for your specific database.  Examples for MySQL and PostgreSQL are below:

#### MySQL
```xml
<datasource jndi-name="java:jboss/datasources/ApicurioDS"
            pool-name="ApicurioDS" enabled="true" use-java-context="true">
  <connection-url>jdbc:mysql://MYSQLSERVER:3306/apicurio</connection-url>
  <driver>mysql-connector-java-5.1.42-bin.jar_com.mysql.jdbc.Driver_5_1</driver>
  <security>
    <user-name>DBUSER</user-name>
    <password>DBPASS</password>
  </security>
</datasource>
```

#### PostgreSQL
```xml
<datasource jndi-name="java:jboss/datasources/ApicurioDS"
            pool-name="ApicurioDS" enabled="true" use-java-context="true">
  <connection-url>jdbc:postgresql://POSTGRESQLSERVER:5432/apicurio</connection-url>
  <driver>postgresql-9.3-1102.jdbc41.jar</driver>
  <security>
    <user-name>DBUSER</user-name>
    <password>DBPASS</password>
  </security>
</datasource>
```

#### AzureSQL
```xml
 <datasource jndi-name="java:jboss/datasources/ApicurioDS" 
             pool-name="ApicurioDS" enabled="true" use-java-context="true">
  <connection-url>jdbc:sqlserver://AZURESQLSERVER:1433;databaseName=DATABASENAME</connection-url>
  <driver>mssql-jdbc-8.4.1.jre8.jar</driver>
  <security>
    <user-name>DBUSEU</user-name>
    <password>DBPASS</password>
  </security>
</datasource>
```

Additional data source configuration settings may be necessary depending on your setup.  Documentation on those additional configuration settings can be found [here](http://docs.jboss.org/jbossas/docs/Administration_And_Configuration_Guide/5/html/ch13s13.html).

### 3.3. Database Type
Finally, you must tell Apicurio Studio what type of database you are using.  This can be done either by setting an environment variable or a system property.

| Config Item | Environment Variable | System Property |
|-------------|----------------------|-----------------|
| Database Type | APICURIO_HUB_STORAGE_JDBC_TYPE | apicurio.hub.storage.jdbc.type |

Valid values for the **apicurio.hub.storage.jdbc.type** property include:

* h2
* mysql5
* postgresql9
* azuresql

One example of how to configure this property is to add the following markup to the **standalone-apicurio.xml** configuration file (after the **<extensions>** section):

#### MySQL
```xml
<system-properties>
    <property name="apicurio.hub.storage.jdbc.type" value="mysql5" />
</system-properties>
```

#### PostgreSQL
```xml
<system-properties>
    <property name="apicurio.hub.storage.jdbc.type" value="postgresql9" />
</system-properties>
```

#### AzureSQL
```xml
<system-properties>
    <property name="apicurio.hub.storage.jdbc.type" value="azuresql" />
</system-properties>
```

### 3.4. Initialize Database
If you have chosen to utilize the DDL to initialize the database, then you want to make sure that Apicurio Studio doesn't try to do that when it starts up (which it will do by default).  To disable the DB initialization on startup, you must set either an environment variable or system property.

| Config Item | Environment Variable | System Property |
|-------------|----------------------|-----------------|
| Initialize Database | APICURIO_HUB_STORAGE_JDBC_INIT | apicurio.hub.storage.jdbc.init |
