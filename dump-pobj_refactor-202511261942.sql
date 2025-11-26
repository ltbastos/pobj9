-- MySQL dump 10.13  Distrib 8.0.19, for Win64 (x86_64)
--
-- Host: localhost    Database: pobj_refactor
-- ------------------------------------------------------
-- Server version	5.5.5-10.1.32-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `agencias`
--

DROP TABLE IF EXISTS `agencias`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `agencias` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `regional_id` int(10) unsigned NOT NULL,
  `nome` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `porte` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_agencia_regional_nome` (`regional_id`,`nome`(191)),
  CONSTRAINT `fk_agencias_regional` FOREIGN KEY (`regional_id`) REFERENCES `regionais` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1268 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `agencias`
--

LOCK TABLES `agencias` WRITE;
/*!40000 ALTER TABLE `agencias` DISABLE KEYS */;
INSERT INTO `agencias` VALUES (1141,8486,'Campo Limpo 1','Medio','2025-11-25 01:54:25','2025-11-25 01:55:05'),(1267,8486,'Faria Lima 2','Medio','2025-11-25 01:54:25','2025-11-25 01:55:05');
/*!40000 ALTER TABLE `agencias` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cargos`
--

DROP TABLE IF EXISTS `cargos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cargos` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `nome` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_cargos_nome` (`nome`(191))
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cargos`
--

LOCK TABLES `cargos` WRITE;
/*!40000 ALTER TABLE `cargos` DISABLE KEYS */;
INSERT INTO `cargos` VALUES (1,'Diretor','2025-11-25 02:02:31','2025-11-25 02:02:36'),(2,'Regional','2025-11-25 02:02:31',NULL),(3,'Gerente de Gestao','2025-11-25 02:02:31',NULL),(4,'Gerente','2025-11-25 02:02:31',NULL);
/*!40000 ALTER TABLE `cargos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `d_calendario`
--

DROP TABLE IF EXISTS `d_calendario`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `d_calendario` (
  `data` date NOT NULL,
  `ano` int(11) NOT NULL,
  `mes` tinyint(4) NOT NULL,
  `mes_nome` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `dia` tinyint(4) NOT NULL,
  `dia_da_semana` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `semana` tinyint(4) NOT NULL,
  `trimestre` tinyint(4) NOT NULL,
  `semestre` tinyint(4) NOT NULL,
  `eh_dia_util` tinyint(1) NOT NULL,
  PRIMARY KEY (`data`),
  KEY `idx_d_calendario_mes` (`ano`,`mes`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `d_calendario`
--

LOCK TABLES `d_calendario` WRITE;
/*!40000 ALTER TABLE `d_calendario` DISABLE KEYS */;
INSERT INTO `d_calendario` VALUES ('2025-01-01',2025,1,'Janeiro',1,'quarta-feira',2,1,1,0),('2025-01-02',2025,1,'Janeiro',2,'quinta-feira',2,1,1,1),('2025-01-03',2025,1,'Janeiro',3,'sexta-feira',2,1,1,1),('2025-01-04',2025,1,'Janeiro',4,'sábado',2,1,1,0),('2025-01-05',2025,1,'Janeiro',5,'domingo',2,1,1,0),('2025-01-06',2025,1,'Janeiro',6,'segunda-feira',3,1,1,1),('2025-01-07',2025,1,'Janeiro',7,'terça-feira',3,1,1,1),('2025-01-08',2025,1,'Janeiro',8,'quarta-feira',3,1,1,1),('2025-01-09',2025,1,'Janeiro',9,'quinta-feira',3,1,1,1),('2025-01-10',2025,1,'Janeiro',10,'sexta-feira',3,1,1,1),('2025-01-11',2025,1,'Janeiro',11,'sábado',3,1,1,0),('2025-01-12',2025,1,'Janeiro',12,'domingo',3,1,1,0),('2025-01-13',2025,1,'Janeiro',13,'segunda-feira',4,1,1,1),('2025-01-14',2025,1,'Janeiro',14,'terça-feira',4,1,1,1),('2025-01-15',2025,1,'Janeiro',15,'quarta-feira',4,1,1,1),('2025-01-16',2025,1,'Janeiro',16,'quinta-feira',4,1,1,1),('2025-01-17',2025,1,'Janeiro',17,'sexta-feira',4,1,1,1),('2025-01-18',2025,1,'Janeiro',18,'sábado',4,1,1,0),('2025-01-19',2025,1,'Janeiro',19,'domingo',4,1,1,0),('2025-01-20',2025,1,'Janeiro',20,'segunda-feira',5,1,1,1),('2025-01-21',2025,1,'Janeiro',21,'terça-feira',5,1,1,1),('2025-01-22',2025,1,'Janeiro',22,'quarta-feira',5,1,1,1),('2025-01-23',2025,1,'Janeiro',23,'quinta-feira',5,1,1,1),('2025-01-24',2025,1,'Janeiro',24,'sexta-feira',5,1,1,1),('2025-01-25',2025,1,'Janeiro',25,'sábado',5,1,1,0),('2025-01-26',2025,1,'Janeiro',26,'domingo',5,1,1,0),('2025-01-27',2025,1,'Janeiro',27,'segunda-feira',6,1,1,1),('2025-01-28',2025,1,'Janeiro',28,'terça-feira',6,1,1,1),('2025-01-29',2025,1,'Janeiro',29,'quarta-feira',6,1,1,1),('2025-01-30',2025,1,'Janeiro',30,'quinta-feira',6,1,1,1),('2025-01-31',2025,1,'Janeiro',31,'sexta-feira',6,1,1,1),('2025-02-01',2025,2,'Fevereiro',1,'sábado',7,1,1,0),('2025-02-02',2025,2,'Fevereiro',2,'domingo',7,1,1,0),('2025-02-03',2025,2,'Fevereiro',3,'segunda-feira',8,1,1,1),('2025-02-04',2025,2,'Fevereiro',4,'terça-feira',8,1,1,1),('2025-02-05',2025,2,'Fevereiro',5,'quarta-feira',8,1,1,1),('2025-02-06',2025,2,'Fevereiro',6,'quinta-feira',8,1,1,1),('2025-02-07',2025,2,'Fevereiro',7,'sexta-feira',8,1,1,1),('2025-02-08',2025,2,'Fevereiro',8,'sábado',8,1,1,0),('2025-02-09',2025,2,'Fevereiro',9,'domingo',8,1,1,0),('2025-02-10',2025,2,'Fevereiro',10,'segunda-feira',9,1,1,1),('2025-02-11',2025,2,'Fevereiro',11,'terça-feira',9,1,1,1),('2025-02-12',2025,2,'Fevereiro',12,'quarta-feira',9,1,1,1),('2025-02-13',2025,2,'Fevereiro',13,'quinta-feira',9,1,1,1),('2025-02-14',2025,2,'Fevereiro',14,'sexta-feira',9,1,1,1),('2025-02-15',2025,2,'Fevereiro',15,'sábado',9,1,1,0),('2025-02-16',2025,2,'Fevereiro',16,'domingo',9,1,1,0),('2025-02-17',2025,2,'Fevereiro',17,'segunda-feira',10,1,1,1),('2025-02-18',2025,2,'Fevereiro',18,'terça-feira',10,1,1,1),('2025-02-19',2025,2,'Fevereiro',19,'quarta-feira',10,1,1,1),('2025-02-20',2025,2,'Fevereiro',20,'quinta-feira',10,1,1,1),('2025-02-21',2025,2,'Fevereiro',21,'sexta-feira',10,1,1,1),('2025-02-22',2025,2,'Fevereiro',22,'sábado',10,1,1,0),('2025-02-23',2025,2,'Fevereiro',23,'domingo',10,1,1,0),('2025-02-24',2025,2,'Fevereiro',24,'segunda-feira',11,1,1,1),('2025-02-25',2025,2,'Fevereiro',25,'terça-feira',11,1,1,1),('2025-02-26',2025,2,'Fevereiro',26,'quarta-feira',11,1,1,1),('2025-02-27',2025,2,'Fevereiro',27,'quinta-feira',11,1,1,1),('2025-02-28',2025,2,'Fevereiro',28,'sexta-feira',11,1,1,1),('2025-03-01',2025,3,'Março',1,'sábado',12,1,1,0),('2025-03-02',2025,3,'Março',2,'domingo',12,1,1,0),('2025-03-03',2025,3,'Março',3,'segunda-feira',13,1,1,1),('2025-03-04',2025,3,'Março',4,'terça-feira',13,1,1,1),('2025-03-05',2025,3,'Março',5,'quarta-feira',13,1,1,1),('2025-03-06',2025,3,'Março',6,'quinta-feira',13,1,1,1),('2025-03-07',2025,3,'Março',7,'sexta-feira',13,1,1,1),('2025-03-08',2025,3,'Março',8,'sábado',13,1,1,0),('2025-03-09',2025,3,'Março',9,'domingo',13,1,1,0),('2025-03-10',2025,3,'Março',10,'segunda-feira',14,1,1,1),('2025-03-11',2025,3,'Março',11,'terça-feira',14,1,1,1),('2025-03-12',2025,3,'Março',12,'quarta-feira',14,1,1,1),('2025-03-13',2025,3,'Março',13,'quinta-feira',14,1,1,1),('2025-03-14',2025,3,'Março',14,'sexta-feira',14,1,1,1),('2025-03-15',2025,3,'Março',15,'sábado',14,1,1,0),('2025-03-16',2025,3,'Março',16,'domingo',14,1,1,0),('2025-03-17',2025,3,'Março',17,'segunda-feira',15,1,1,1),('2025-03-18',2025,3,'Março',18,'terça-feira',15,1,1,1),('2025-03-19',2025,3,'Março',19,'quarta-feira',15,1,1,1),('2025-03-20',2025,3,'Março',20,'quinta-feira',15,1,1,1),('2025-03-21',2025,3,'Março',21,'sexta-feira',15,1,1,1),('2025-03-22',2025,3,'Março',22,'sábado',15,1,1,0),('2025-03-23',2025,3,'Março',23,'domingo',15,1,1,0),('2025-03-24',2025,3,'Março',24,'segunda-feira',16,1,1,1),('2025-03-25',2025,3,'Março',25,'terça-feira',16,1,1,1),('2025-03-26',2025,3,'Março',26,'quarta-feira',16,1,1,1),('2025-03-27',2025,3,'Março',27,'quinta-feira',16,1,1,1),('2025-03-28',2025,3,'Março',28,'sexta-feira',16,1,1,1),('2025-03-29',2025,3,'Março',29,'sábado',16,1,1,0),('2025-03-30',2025,3,'Março',30,'domingo',16,1,1,0),('2025-03-31',2025,3,'Março',31,'segunda-feira',17,1,1,1),('2025-04-01',2025,4,'Abril',1,'terça-feira',18,2,1,1),('2025-04-02',2025,4,'Abril',2,'quarta-feira',18,2,1,1),('2025-04-03',2025,4,'Abril',3,'quinta-feira',18,2,1,1),('2025-04-04',2025,4,'Abril',4,'sexta-feira',18,2,1,1),('2025-04-05',2025,4,'Abril',5,'sábado',18,2,1,0),('2025-04-06',2025,4,'Abril',6,'domingo',18,2,1,0),('2025-04-07',2025,4,'Abril',7,'segunda-feira',19,2,1,1),('2025-04-08',2025,4,'Abril',8,'terça-feira',19,2,1,1),('2025-04-09',2025,4,'Abril',9,'quarta-feira',19,2,1,1),('2025-04-10',2025,4,'Abril',10,'quinta-feira',19,2,1,1),('2025-04-11',2025,4,'Abril',11,'sexta-feira',19,2,1,1),('2025-04-12',2025,4,'Abril',12,'sábado',19,2,1,0),('2025-04-13',2025,4,'Abril',13,'domingo',19,2,1,0),('2025-04-14',2025,4,'Abril',14,'segunda-feira',20,2,1,1),('2025-04-15',2025,4,'Abril',15,'terça-feira',20,2,1,1),('2025-04-16',2025,4,'Abril',16,'quarta-feira',20,2,1,1),('2025-04-17',2025,4,'Abril',17,'quinta-feira',20,2,1,1),('2025-04-18',2025,4,'Abril',18,'sexta-feira',20,2,1,0),('2025-04-19',2025,4,'Abril',19,'sábado',20,2,1,0),('2025-04-20',2025,4,'Abril',20,'domingo',20,2,1,0),('2025-04-21',2025,4,'Abril',21,'segunda-feira',21,2,1,0),('2025-04-22',2025,4,'Abril',22,'terça-feira',21,2,1,1),('2025-04-23',2025,4,'Abril',23,'quarta-feira',21,2,1,1),('2025-04-24',2025,4,'Abril',24,'quinta-feira',21,2,1,1),('2025-04-25',2025,4,'Abril',25,'sexta-feira',21,2,1,1),('2025-04-26',2025,4,'Abril',26,'sábado',21,2,1,0),('2025-04-27',2025,4,'Abril',27,'domingo',21,2,1,0),('2025-04-28',2025,4,'Abril',28,'segunda-feira',22,2,1,1),('2025-04-29',2025,4,'Abril',29,'terça-feira',22,2,1,1),('2025-04-30',2025,4,'Abril',30,'quarta-feira',22,2,1,1),('2025-05-01',2025,5,'Maio',1,'quinta-feira',23,2,1,0),('2025-05-02',2025,5,'Maio',2,'sexta-feira',23,2,1,1),('2025-05-03',2025,5,'Maio',3,'sábado',23,2,1,0),('2025-05-04',2025,5,'Maio',4,'domingo',23,2,1,0),('2025-05-05',2025,5,'Maio',5,'segunda-feira',24,2,1,1),('2025-05-06',2025,5,'Maio',6,'terça-feira',24,2,1,1),('2025-05-07',2025,5,'Maio',7,'quarta-feira',24,2,1,1),('2025-05-08',2025,5,'Maio',8,'quinta-feira',24,2,1,1),('2025-05-09',2025,5,'Maio',9,'sexta-feira',24,2,1,1),('2025-05-10',2025,5,'Maio',10,'sábado',24,2,1,0),('2025-05-11',2025,5,'Maio',11,'domingo',24,2,1,0),('2025-05-12',2025,5,'Maio',12,'segunda-feira',25,2,1,1),('2025-05-13',2025,5,'Maio',13,'terça-feira',25,2,1,1),('2025-05-14',2025,5,'Maio',14,'quarta-feira',25,2,1,1),('2025-05-15',2025,5,'Maio',15,'quinta-feira',25,2,1,1),('2025-05-16',2025,5,'Maio',16,'sexta-feira',25,2,1,1),('2025-05-17',2025,5,'Maio',17,'sábado',25,2,1,0),('2025-05-18',2025,5,'Maio',18,'domingo',25,2,1,0),('2025-05-19',2025,5,'Maio',19,'segunda-feira',26,2,1,1),('2025-05-20',2025,5,'Maio',20,'terça-feira',26,2,1,1),('2025-05-21',2025,5,'Maio',21,'quarta-feira',26,2,1,1),('2025-05-22',2025,5,'Maio',22,'quinta-feira',26,2,1,1),('2025-05-23',2025,5,'Maio',23,'sexta-feira',26,2,1,1),('2025-05-24',2025,5,'Maio',24,'sábado',26,2,1,0),('2025-05-25',2025,5,'Maio',25,'domingo',26,2,1,0),('2025-05-26',2025,5,'Maio',26,'segunda-feira',27,2,1,1),('2025-05-27',2025,5,'Maio',27,'terça-feira',27,2,1,1),('2025-05-28',2025,5,'Maio',28,'quarta-feira',27,2,1,1),('2025-05-29',2025,5,'Maio',29,'quinta-feira',27,2,1,1),('2025-05-30',2025,5,'Maio',30,'sexta-feira',27,2,1,1),('2025-05-31',2025,5,'Maio',31,'sábado',27,2,1,0),('2025-06-01',2025,6,'Junho',1,'domingo',28,2,1,0),('2025-06-02',2025,6,'Junho',2,'segunda-feira',29,2,1,1),('2025-06-03',2025,6,'Junho',3,'terça-feira',29,2,1,1),('2025-06-04',2025,6,'Junho',4,'quarta-feira',29,2,1,1),('2025-06-05',2025,6,'Junho',5,'quinta-feira',29,2,1,1),('2025-06-06',2025,6,'Junho',6,'sexta-feira',29,2,1,1),('2025-06-07',2025,6,'Junho',7,'sábado',29,2,1,0),('2025-06-08',2025,6,'Junho',8,'domingo',29,2,1,0),('2025-06-09',2025,6,'Junho',9,'segunda-feira',30,2,1,1),('2025-06-10',2025,6,'Junho',10,'terça-feira',30,2,1,1),('2025-06-11',2025,6,'Junho',11,'quarta-feira',30,2,1,1),('2025-06-12',2025,6,'Junho',12,'quinta-feira',30,2,1,1),('2025-06-13',2025,6,'Junho',13,'sexta-feira',30,2,1,1),('2025-06-14',2025,6,'Junho',14,'sábado',30,2,1,0),('2025-06-15',2025,6,'Junho',15,'domingo',30,2,1,0),('2025-06-16',2025,6,'Junho',16,'segunda-feira',31,2,1,1),('2025-06-17',2025,6,'Junho',17,'terça-feira',31,2,1,1),('2025-06-18',2025,6,'Junho',18,'quarta-feira',31,2,1,1),('2025-06-19',2025,6,'Junho',19,'quinta-feira',31,2,1,0),('2025-06-20',2025,6,'Junho',20,'sexta-feira',31,2,1,1),('2025-06-21',2025,6,'Junho',21,'sábado',31,2,1,0),('2025-06-22',2025,6,'Junho',22,'domingo',31,2,1,0),('2025-06-23',2025,6,'Junho',23,'segunda-feira',32,2,1,1),('2025-06-24',2025,6,'Junho',24,'terça-feira',32,2,1,1),('2025-06-25',2025,6,'Junho',25,'quarta-feira',32,2,1,1),('2025-06-26',2025,6,'Junho',26,'quinta-feira',32,2,1,1),('2025-06-27',2025,6,'Junho',27,'sexta-feira',32,2,1,1),('2025-06-28',2025,6,'Junho',28,'sábado',32,2,1,0),('2025-06-29',2025,6,'Junho',29,'domingo',32,2,1,0),('2025-06-30',2025,6,'Junho',30,'segunda-feira',33,2,1,1),('2025-07-01',2025,7,'Julho',1,'terça-feira',34,3,2,1),('2025-07-02',2025,7,'Julho',2,'quarta-feira',34,3,2,1),('2025-07-03',2025,7,'Julho',3,'quinta-feira',34,3,2,1),('2025-07-04',2025,7,'Julho',4,'sexta-feira',34,3,2,1),('2025-07-05',2025,7,'Julho',5,'sábado',34,3,2,0),('2025-07-06',2025,7,'Julho',6,'domingo',34,3,2,0),('2025-07-07',2025,7,'Julho',7,'segunda-feira',35,3,2,1),('2025-07-08',2025,7,'Julho',8,'terça-feira',35,3,2,1),('2025-07-09',2025,7,'Julho',9,'quarta-feira',35,3,2,1),('2025-07-10',2025,7,'Julho',10,'quinta-feira',35,3,2,1),('2025-07-11',2025,7,'Julho',11,'sexta-feira',35,3,2,1),('2025-07-12',2025,7,'Julho',12,'sábado',35,3,2,0),('2025-07-13',2025,7,'Julho',13,'domingo',35,3,2,0),('2025-07-14',2025,7,'Julho',14,'segunda-feira',36,3,2,1),('2025-07-15',2025,7,'Julho',15,'terça-feira',36,3,2,1),('2025-07-16',2025,7,'Julho',16,'quarta-feira',36,3,2,1),('2025-07-17',2025,7,'Julho',17,'quinta-feira',36,3,2,1),('2025-07-18',2025,7,'Julho',18,'sexta-feira',36,3,2,1),('2025-07-19',2025,7,'Julho',19,'sábado',36,3,2,0),('2025-07-20',2025,7,'Julho',20,'domingo',36,3,2,0),('2025-07-21',2025,7,'Julho',21,'segunda-feira',37,3,2,1),('2025-07-22',2025,7,'Julho',22,'terça-feira',37,3,2,1),('2025-07-23',2025,7,'Julho',23,'quarta-feira',37,3,2,1),('2025-07-24',2025,7,'Julho',24,'quinta-feira',37,3,2,1),('2025-07-25',2025,7,'Julho',25,'sexta-feira',37,3,2,1),('2025-07-26',2025,7,'Julho',26,'sábado',37,3,2,0),('2025-07-27',2025,7,'Julho',27,'domingo',37,3,2,0),('2025-07-28',2025,7,'Julho',28,'segunda-feira',38,3,2,1),('2025-07-29',2025,7,'Julho',29,'terça-feira',38,3,2,1),('2025-07-30',2025,7,'Julho',30,'quarta-feira',38,3,2,1),('2025-07-31',2025,7,'Julho',31,'quinta-feira',38,3,2,1),('2025-08-01',2025,8,'Agosto',1,'sexta-feira',39,3,2,1),('2025-08-02',2025,8,'Agosto',2,'sábado',39,3,2,0),('2025-08-03',2025,8,'Agosto',3,'domingo',39,3,2,0),('2025-08-04',2025,8,'Agosto',4,'segunda-feira',40,3,2,1),('2025-08-05',2025,8,'Agosto',5,'terça-feira',40,3,2,1),('2025-08-06',2025,8,'Agosto',6,'quarta-feira',40,3,2,1),('2025-08-07',2025,8,'Agosto',7,'quinta-feira',40,3,2,1),('2025-08-08',2025,8,'Agosto',8,'sexta-feira',40,3,2,1),('2025-08-09',2025,8,'Agosto',9,'sábado',40,3,2,0),('2025-08-10',2025,8,'Agosto',10,'domingo',40,3,2,0),('2025-08-11',2025,8,'Agosto',11,'segunda-feira',41,3,2,1),('2025-08-12',2025,8,'Agosto',12,'terça-feira',41,3,2,1),('2025-08-13',2025,8,'Agosto',13,'quarta-feira',41,3,2,1),('2025-08-14',2025,8,'Agosto',14,'quinta-feira',41,3,2,1),('2025-08-15',2025,8,'Agosto',15,'sexta-feira',41,3,2,1),('2025-08-16',2025,8,'Agosto',16,'sábado',41,3,2,0),('2025-08-17',2025,8,'Agosto',17,'domingo',41,3,2,0),('2025-08-18',2025,8,'Agosto',18,'segunda-feira',42,3,2,1),('2025-08-19',2025,8,'Agosto',19,'terça-feira',42,3,2,1),('2025-08-20',2025,8,'Agosto',20,'quarta-feira',42,3,2,1),('2025-08-21',2025,8,'Agosto',21,'quinta-feira',42,3,2,1),('2025-08-22',2025,8,'Agosto',22,'sexta-feira',42,3,2,1),('2025-08-23',2025,8,'Agosto',23,'sábado',42,3,2,0),('2025-08-24',2025,8,'Agosto',24,'domingo',42,3,2,0),('2025-08-25',2025,8,'Agosto',25,'segunda-feira',43,3,2,1),('2025-08-26',2025,8,'Agosto',26,'terça-feira',43,3,2,1),('2025-08-27',2025,8,'Agosto',27,'quarta-feira',43,3,2,1),('2025-08-28',2025,8,'Agosto',28,'quinta-feira',43,3,2,1),('2025-08-29',2025,8,'Agosto',29,'sexta-feira',43,3,2,1),('2025-08-30',2025,8,'Agosto',30,'sábado',43,3,2,0),('2025-08-31',2025,8,'Agosto',31,'domingo',43,3,2,0),('2025-09-01',2025,9,'Setembro',1,'segunda-feira',44,3,2,1),('2025-09-02',2025,9,'Setembro',2,'terça-feira',44,3,2,1),('2025-09-03',2025,9,'Setembro',3,'quarta-feira',44,3,2,1),('2025-09-04',2025,9,'Setembro',4,'quinta-feira',44,3,2,1),('2025-09-05',2025,9,'Setembro',5,'sexta-feira',44,3,2,1),('2025-09-06',2025,9,'Setembro',6,'sábado',44,3,2,0),('2025-09-07',2025,9,'Setembro',7,'domingo',44,3,2,0),('2025-09-08',2025,9,'Setembro',8,'segunda-feira',45,3,2,1),('2025-09-09',2025,9,'Setembro',9,'terça-feira',45,3,2,1),('2025-09-10',2025,9,'Setembro',10,'quarta-feira',45,3,2,1),('2025-09-11',2025,9,'Setembro',11,'quinta-feira',45,3,2,1),('2025-09-12',2025,9,'Setembro',12,'sexta-feira',45,3,2,1),('2025-09-13',2025,9,'Setembro',13,'sábado',45,3,2,0),('2025-09-14',2025,9,'Setembro',14,'domingo',45,3,2,0),('2025-09-15',2025,9,'Setembro',15,'segunda-feira',46,3,2,1),('2025-09-16',2025,9,'Setembro',16,'terça-feira',46,3,2,1),('2025-09-17',2025,9,'Setembro',17,'quarta-feira',46,3,2,1),('2025-09-18',2025,9,'Setembro',18,'quinta-feira',46,3,2,1),('2025-09-19',2025,9,'Setembro',19,'sexta-feira',46,3,2,1),('2025-09-20',2025,9,'Setembro',20,'sábado',46,3,2,0),('2025-09-21',2025,9,'Setembro',21,'domingo',46,3,2,0),('2025-09-22',2025,9,'Setembro',22,'segunda-feira',47,3,2,1),('2025-09-23',2025,9,'Setembro',23,'terça-feira',47,3,2,1),('2025-09-24',2025,9,'Setembro',24,'quarta-feira',47,3,2,1),('2025-09-25',2025,9,'Setembro',25,'quinta-feira',47,3,2,1),('2025-09-26',2025,9,'Setembro',26,'sexta-feira',47,3,2,1),('2025-09-27',2025,9,'Setembro',27,'sábado',47,3,2,0),('2025-09-28',2025,9,'Setembro',28,'domingo',47,3,2,0),('2025-09-29',2025,9,'Setembro',29,'segunda-feira',48,3,2,1),('2025-09-30',2025,9,'Setembro',30,'terça-feira',48,3,2,1),('2025-10-01',2025,10,'Outubro',1,'quarta-feira',49,4,2,1),('2025-10-02',2025,10,'Outubro',2,'quinta-feira',49,4,2,1),('2025-10-03',2025,10,'Outubro',3,'sexta-feira',49,4,2,1),('2025-10-04',2025,10,'Outubro',4,'sábado',49,4,2,0),('2025-10-05',2025,10,'Outubro',5,'domingo',49,4,2,0),('2025-10-06',2025,10,'Outubro',6,'segunda-feira',50,4,2,1),('2025-10-07',2025,10,'Outubro',7,'terça-feira',50,4,2,1),('2025-10-08',2025,10,'Outubro',8,'quarta-feira',50,4,2,1),('2025-10-09',2025,10,'Outubro',9,'quinta-feira',50,4,2,1),('2025-10-10',2025,10,'Outubro',10,'sexta-feira',50,4,2,1),('2025-10-11',2025,10,'Outubro',11,'sábado',50,4,2,0),('2025-10-12',2025,10,'Outubro',12,'domingo',50,4,2,0),('2025-10-13',2025,10,'Outubro',13,'segunda-feira',51,4,2,1),('2025-10-14',2025,10,'Outubro',14,'terça-feira',51,4,2,1),('2025-10-15',2025,10,'Outubro',15,'quarta-feira',51,4,2,1),('2025-10-16',2025,10,'Outubro',16,'quinta-feira',51,4,2,1),('2025-10-17',2025,10,'Outubro',17,'sexta-feira',51,4,2,1),('2025-10-18',2025,10,'Outubro',18,'sábado',51,4,2,0),('2025-10-19',2025,10,'Outubro',19,'domingo',51,4,2,0),('2025-10-20',2025,10,'Outubro',20,'segunda-feira',52,4,2,1),('2025-10-21',2025,10,'Outubro',21,'terça-feira',52,4,2,1),('2025-10-22',2025,10,'Outubro',22,'quarta-feira',52,4,2,1),('2025-10-23',2025,10,'Outubro',23,'quinta-feira',52,4,2,1),('2025-10-24',2025,10,'Outubro',24,'sexta-feira',52,4,2,1),('2025-10-25',2025,10,'Outubro',25,'sábado',52,4,2,0),('2025-10-26',2025,10,'Outubro',26,'domingo',52,4,2,0),('2025-10-27',2025,10,'Outubro',27,'segunda-feira',53,4,2,1),('2025-10-28',2025,10,'Outubro',28,'terça-feira',53,4,2,1),('2025-10-29',2025,10,'Outubro',29,'quarta-feira',53,4,2,1),('2025-10-30',2025,10,'Outubro',30,'quinta-feira',53,4,2,1),('2025-10-31',2025,10,'Outubro',31,'sexta-feira',53,4,2,1),('2025-11-01',2025,11,'Novembro',1,'sábado',54,4,2,0),('2025-11-02',2025,11,'Novembro',2,'domingo',54,4,2,0),('2025-11-03',2025,11,'Novembro',3,'segunda-feira',55,4,2,1),('2025-11-04',2025,11,'Novembro',4,'terça-feira',55,4,2,1),('2025-11-05',2025,11,'Novembro',5,'quarta-feira',55,4,2,1),('2025-11-06',2025,11,'Novembro',6,'quinta-feira',55,4,2,1),('2025-11-07',2025,11,'Novembro',7,'sexta-feira',55,4,2,1),('2025-11-08',2025,11,'Novembro',8,'sábado',55,4,2,0),('2025-11-09',2025,11,'Novembro',9,'domingo',55,4,2,0),('2025-11-10',2025,11,'Novembro',10,'segunda-feira',56,4,2,1),('2025-11-11',2025,11,'Novembro',11,'terça-feira',56,4,2,1),('2025-11-12',2025,11,'Novembro',12,'quarta-feira',56,4,2,1),('2025-11-13',2025,11,'Novembro',13,'quinta-feira',56,4,2,1),('2025-11-14',2025,11,'Novembro',14,'sexta-feira',56,4,2,1),('2025-11-15',2025,11,'Novembro',15,'sábado',56,4,2,0),('2025-11-16',2025,11,'Novembro',16,'domingo',56,4,2,0),('2025-11-17',2025,11,'Novembro',17,'segunda-feira',57,4,2,1),('2025-11-18',2025,11,'Novembro',18,'terça-feira',57,4,2,1),('2025-11-19',2025,11,'Novembro',19,'quarta-feira',57,4,2,1),('2025-11-20',2025,11,'Novembro',20,'quinta-feira',57,4,2,0),('2025-11-21',2025,11,'Novembro',21,'sexta-feira',57,4,2,1),('2025-11-22',2025,11,'Novembro',22,'sábado',57,4,2,0),('2025-11-23',2025,11,'Novembro',23,'domingo',57,4,2,0),('2025-11-24',2025,11,'Novembro',24,'segunda-feira',58,4,2,1),('2025-11-25',2025,11,'Novembro',25,'terça-feira',58,4,2,1),('2025-11-26',2025,11,'Novembro',26,'quarta-feira',58,4,2,1),('2025-11-27',2025,11,'Novembro',27,'quinta-feira',58,4,2,1),('2025-11-28',2025,11,'Novembro',28,'sexta-feira',58,4,2,1),('2025-11-29',2025,11,'Novembro',29,'sábado',58,4,2,0),('2025-11-30',2025,11,'Novembro',30,'domingo',58,4,2,0),('2025-12-01',2025,12,'Dezembro',1,'segunda-feira',59,4,2,1),('2025-12-02',2025,12,'Dezembro',2,'terça-feira',59,4,2,1),('2025-12-03',2025,12,'Dezembro',3,'quarta-feira',59,4,2,1),('2025-12-04',2025,12,'Dezembro',4,'quinta-feira',59,4,2,1),('2025-12-05',2025,12,'Dezembro',5,'sexta-feira',59,4,2,1),('2025-12-06',2025,12,'Dezembro',6,'sábado',59,4,2,0),('2025-12-07',2025,12,'Dezembro',7,'domingo',59,4,2,0),('2025-12-08',2025,12,'Dezembro',8,'segunda-feira',60,4,2,1),('2025-12-09',2025,12,'Dezembro',9,'terça-feira',60,4,2,1),('2025-12-10',2025,12,'Dezembro',10,'quarta-feira',60,4,2,1),('2025-12-11',2025,12,'Dezembro',11,'quinta-feira',60,4,2,1),('2025-12-12',2025,12,'Dezembro',12,'sexta-feira',60,4,2,1),('2025-12-13',2025,12,'Dezembro',13,'sábado',60,4,2,0),('2025-12-14',2025,12,'Dezembro',14,'domingo',60,4,2,0),('2025-12-15',2025,12,'Dezembro',15,'segunda-feira',61,4,2,1),('2025-12-16',2025,12,'Dezembro',16,'terça-feira',61,4,2,1),('2025-12-17',2025,12,'Dezembro',17,'quarta-feira',61,4,2,1),('2025-12-18',2025,12,'Dezembro',18,'quinta-feira',61,4,2,1),('2025-12-19',2025,12,'Dezembro',19,'sexta-feira',61,4,2,1),('2025-12-20',2025,12,'Dezembro',20,'sábado',61,4,2,0),('2025-12-21',2025,12,'Dezembro',21,'domingo',61,4,2,0),('2025-12-22',2025,12,'Dezembro',22,'segunda-feira',62,4,2,1),('2025-12-23',2025,12,'Dezembro',23,'terça-feira',62,4,2,1),('2025-12-24',2025,12,'Dezembro',24,'quarta-feira',62,4,2,1),('2025-12-25',2025,12,'Dezembro',25,'quinta-feira',62,4,2,0),('2025-12-26',2025,12,'Dezembro',26,'sexta-feira',62,4,2,1),('2025-12-27',2025,12,'Dezembro',27,'sábado',62,4,2,0),('2025-12-28',2025,12,'Dezembro',28,'domingo',62,4,2,0),('2025-12-29',2025,12,'Dezembro',29,'segunda-feira',63,4,2,1),('2025-12-30',2025,12,'Dezembro',30,'terça-feira',63,4,2,1),('2025-12-31',2025,12,'Dezembro',31,'quarta-feira',63,4,2,1);
/*!40000 ALTER TABLE `d_calendario` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `d_estrutura`
--

DROP TABLE IF EXISTS `d_estrutura`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `d_estrutura` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `funcional` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nome` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `cargo_id` int(10) unsigned NOT NULL,
  `segmento_id` int(10) unsigned DEFAULT NULL,
  `diretoria_id` int(10) unsigned DEFAULT NULL,
  `regional_id` int(10) unsigned DEFAULT NULL,
  `agencia_id` int(10) unsigned DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `funcional` (`funcional`),
  KEY `fk_estrutura_cargo` (`cargo_id`),
  KEY `fk_estrutura_segmento` (`segmento_id`),
  KEY `fk_estrutura_diretoria` (`diretoria_id`),
  KEY `fk_estrutura_regional` (`regional_id`),
  KEY `fk_estrutura_agencia` (`agencia_id`),
  CONSTRAINT `fk_estrutura_agencia` FOREIGN KEY (`agencia_id`) REFERENCES `agencias` (`id`),
  CONSTRAINT `fk_estrutura_cargo` FOREIGN KEY (`cargo_id`) REFERENCES `cargos` (`id`),
  CONSTRAINT `fk_estrutura_diretoria` FOREIGN KEY (`diretoria_id`) REFERENCES `diretorias` (`id`),
  CONSTRAINT `fk_estrutura_regional` FOREIGN KEY (`regional_id`) REFERENCES `regionais` (`id`),
  CONSTRAINT `fk_estrutura_segmento` FOREIGN KEY (`segmento_id`) REFERENCES `segmentos` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `d_estrutura`
--

LOCK TABLES `d_estrutura` WRITE;
/*!40000 ALTER TABLE `d_estrutura` DISABLE KEYS */;
INSERT INTO `d_estrutura` VALUES (2,'i010001','José Gerente',4,1,8607,8486,1141,'2025-11-25 02:02:46','2025-11-25 03:46:53'),(3,'i020212','Pedro Gerente',4,1,8607,8486,1141,'2025-11-25 02:02:46','2025-11-25 03:46:53'),(4,'i020213','Maria Gerente',4,1,8607,8486,1267,'2025-11-25 02:02:46','2025-11-25 03:46:53'),(5,'i020219','Andre Gestor',3,1,8607,8486,1267,'2025-11-25 02:02:46','2025-11-25 03:46:53'),(6,'i020220','Marcio Gestor',3,1,8607,8486,1141,'2025-11-25 02:02:46','2025-11-25 03:46:53'),(7,'i020221','Carlos Diretor',1,1,8607,NULL,NULL,'2025-11-25 02:02:46',NULL),(8,'i020230','Ana Regional',2,1,8607,8486,NULL,'2025-11-25 02:02:46','2025-11-25 03:46:53');
/*!40000 ALTER TABLE `d_estrutura` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `d_produtos`
--

DROP TABLE IF EXISTS `d_produtos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `d_produtos` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `familia_id` int(11) NOT NULL,
  `indicador_id` int(11) NOT NULL,
  `subindicador_id` int(11) DEFAULT NULL,
  `peso` decimal(10,2) NOT NULL DEFAULT '0.00',
  `metrica` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'valor',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_indicador_sub` (`indicador_id`,`subindicador_id`),
  KEY `idx_familia` (`familia_id`),
  KEY `idx_indicador` (`indicador_id`),
  KEY `idx_subindicador` (`subindicador_id`),
  CONSTRAINT `d_produtos_ibfk_1` FOREIGN KEY (`familia_id`) REFERENCES `familia` (`id`),
  CONSTRAINT `d_produtos_ibfk_2` FOREIGN KEY (`indicador_id`) REFERENCES `indicador` (`id`),
  CONSTRAINT `d_produtos_ibfk_3` FOREIGN KEY (`subindicador_id`) REFERENCES `subindicador` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=84 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `d_produtos`
--

LOCK TABLES `d_produtos` WRITE;
/*!40000 ALTER TABLE `d_produtos` DISABLE KEYS */;
INSERT INTO `d_produtos` VALUES (1,1,1,2,0.15,'valor'),(2,1,1,3,0.15,'valor'),(3,1,2,NULL,0.00,'valor'),(82,2,3,5,0.25,'valor'),(83,3,4,1,0.25,'Percentual');
/*!40000 ALTER TABLE `d_produtos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `d_status_indicadores`
--

DROP TABLE IF EXISTS `d_status_indicadores`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `d_status_indicadores` (
  `id` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_d_status_nome` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `d_status_indicadores`
--

LOCK TABLES `d_status_indicadores` WRITE;
/*!40000 ALTER TABLE `d_status_indicadores` DISABLE KEYS */;
INSERT INTO `d_status_indicadores` VALUES ('01','Atingido'),('02','Não Atingido'),('03','Todos');
/*!40000 ALTER TABLE `d_status_indicadores` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `diretorias`
--

DROP TABLE IF EXISTS `diretorias`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `diretorias` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `segmento_id` int(10) unsigned NOT NULL,
  `nome` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_diretoria_segmento_nome` (`segmento_id`,`nome`(191)),
  CONSTRAINT `fk_diretorias_segmento` FOREIGN KEY (`segmento_id`) REFERENCES `segmentos` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=8608 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `diretorias`
--

LOCK TABLES `diretorias` WRITE;
/*!40000 ALTER TABLE `diretorias` DISABLE KEYS */;
INSERT INTO `diretorias` VALUES (8607,1,'Empresas','2025-11-25 01:52:39',NULL);
/*!40000 ALTER TABLE `diretorias` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `f_campanhas`
--

DROP TABLE IF EXISTS `f_campanhas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `f_campanhas` (
  `campanha_id` varchar(60) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sprint_id` varchar(60) COLLATE utf8mb4_unicode_ci NOT NULL,
  `diretoria_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `diretoria_nome` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `gerencia_regional_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `regional_nome` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `agencia_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `agencia_nome` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `gerente_gestao_id` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `gerente_gestao_nome` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `gerente_id` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `gerente_nome` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `segmento` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `segmento_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `familia_id` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `id_indicador` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ds_indicador` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `subproduto` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `id_subindicador` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '0',
  `carteira` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `linhas` decimal(18,2) DEFAULT NULL,
  `cash` decimal(18,2) DEFAULT NULL,
  `conquista` decimal(18,2) DEFAULT NULL,
  `atividade` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `data` date NOT NULL,
  `familia_codigo` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `indicador_codigo` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `subindicador_codigo` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`campanha_id`),
  KEY `idx_f_campanhas_data` (`data`),
  KEY `idx_f_campanhas_diretoria` (`diretoria_id`),
  KEY `idx_f_campanhas_gerencia` (`gerencia_regional_id`),
  KEY `idx_f_campanhas_indicador` (`id_indicador`),
  KEY `idx_f_campanhas_unidade` (`segmento_id`(20),`diretoria_id`(20),`gerencia_regional_id`(20),`agencia_id`(20)),
  KEY `fk_campanhas_produtos` (`id_indicador`,`id_subindicador`),
  CONSTRAINT `fk_campanhas_calendario_data` FOREIGN KEY (`data`) REFERENCES `d_calendario` (`data`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `f_campanhas`
--

LOCK TABLES `f_campanhas` WRITE;
/*!40000 ALTER TABLE `f_campanhas` DISABLE KEYS */;
/*!40000 ALTER TABLE `f_campanhas` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `f_detalhes`
--

DROP TABLE IF EXISTS `f_detalhes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `f_detalhes` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `contrato_id` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `registro_id` varchar(60) COLLATE utf8mb4_unicode_ci NOT NULL,
  `funcional` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `id_produto` int(11) NOT NULL,
  `dt_cadastro` date NOT NULL,
  `competencia` date NOT NULL,
  `valor_meta` decimal(18,2) DEFAULT NULL,
  `valor_realizado` decimal(18,2) DEFAULT NULL,
  `quantidade` decimal(18,4) DEFAULT NULL,
  `peso` decimal(18,4) DEFAULT NULL,
  `pontos` decimal(18,4) DEFAULT NULL,
  `dt_vencimento` date DEFAULT NULL,
  `dt_cancelamento` date DEFAULT NULL,
  `motivo_cancelamento` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `canal_venda` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tipo_venda` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `condicao_pagamento` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status_id` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_fd_contrato` (`contrato_id`),
  KEY `idx_fd_funcional` (`funcional`),
  KEY `idx_fd_registro` (`registro_id`),
  KEY `idx_fd_produto` (`id_produto`),
  KEY `idx_fd_dt_cadastro` (`dt_cadastro`),
  KEY `idx_fd_competencia` (`competencia`),
  KEY `fk_fd_status` (`status_id`),
  CONSTRAINT `fk_fd_comp` FOREIGN KEY (`competencia`) REFERENCES `d_calendario` (`data`) ON UPDATE CASCADE,
  CONSTRAINT `fk_fd_dt_cadastro` FOREIGN KEY (`dt_cadastro`) REFERENCES `d_calendario` (`data`) ON UPDATE CASCADE,
  CONSTRAINT `fk_fd_estrutura` FOREIGN KEY (`funcional`) REFERENCES `d_estrutura` (`funcional`) ON UPDATE CASCADE,
  CONSTRAINT `fk_fd_produto` FOREIGN KEY (`id_produto`) REFERENCES `d_produtos` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `fk_fd_status` FOREIGN KEY (`status_id`) REFERENCES `d_status_indicadores` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `f_detalhes`
--

LOCK TABLES `f_detalhes` WRITE;
/*!40000 ALTER TABLE `f_detalhes` DISABLE KEYS */;
INSERT INTO `f_detalhes` VALUES (7,'CONT1697CAP001','REAL_1697_CAP001_202501','i010001',1,'2025-01-15','2025-01-01',60000.00,64500.00,6.0000,40.0000,38.0000,NULL,NULL,NULL,'Presencial','Venda ativa','Parcelado','01'),(8,'CONT3336CRE001','REAL_3336_CRE001_202506','i010001',1,'2025-06-18','2025-06-01',82000.00,83500.00,4.0000,35.0000,34.5000,NULL,NULL,NULL,'Digital','Renovação','À vista','01'),(9,'CONT7378LIG001','REAL_7378_LIG001_202510','i020212',1,'2025-10-09','2025-10-01',95000.00,98250.00,5.0000,42.0000,41.0000,NULL,NULL,NULL,'Híbrido','Campanha','Parcelado','01'),(10,'CT-2025-000101','REAL_1697_CAP001_202501','i020212',1,'2025-01-15','2025-01-01',60000.00,64500.00,6.0000,40.0000,38.0000,'2025-02-10',NULL,NULL,'Presencial','Venda ativa','Parcelado','01'),(11,'CT-2025-000305','REAL_3336_CRE001_202506','i020213',1,'2025-06-18','2025-06-01',82000.00,83500.00,4.0000,35.0000,34.5000,'2025-07-20',NULL,NULL,'Digital','Renovação','À vista','01'),(12,'CT-2025-000512','REAL_7378_LIG001_202510','i020213',1,'2025-10-09','2025-10-01',95000.00,98250.00,5.0000,42.0000,41.0000,'2025-10-11',NULL,NULL,'Híbrido','Campanha','Parcelado','01');
/*!40000 ALTER TABLE `f_detalhes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `f_historico_ranking_pobj`
--

DROP TABLE IF EXISTS `f_historico_ranking_pobj`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `f_historico_ranking_pobj` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `data` date NOT NULL,
  `funcional` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `grupo` int(11) DEFAULT NULL,
  `ranking` int(11) DEFAULT NULL,
  `realizado` decimal(18,2) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_hist_data` (`data`),
  KEY `idx_hist_funcional` (`funcional`),
  KEY `idx_hist_ranking` (`ranking`),
  CONSTRAINT `fk_hist_pobj_calendario` FOREIGN KEY (`data`) REFERENCES `d_calendario` (`data`) ON UPDATE CASCADE,
  CONSTRAINT `fk_hist_pobj_estrutura` FOREIGN KEY (`funcional`) REFERENCES `d_estrutura` (`funcional`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `f_historico_ranking_pobj`
--

LOCK TABLES `f_historico_ranking_pobj` WRITE;
/*!40000 ALTER TABLE `f_historico_ranking_pobj` DISABLE KEYS */;
INSERT INTO `f_historico_ranking_pobj` VALUES (1,'2025-11-22','i010001',2,1,780000.00),(2,'2025-11-22','i020212',2,2,128000.00),(3,'2025-11-22','i020213',2,3,126000.00);
/*!40000 ALTER TABLE `f_historico_ranking_pobj` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `f_meta`
--

DROP TABLE IF EXISTS `f_meta`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `f_meta` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `data_meta` date NOT NULL,
  `funcional` varchar(16) COLLATE utf8mb4_unicode_ci NOT NULL,
  `produto_id` int(11) NOT NULL,
  `meta_mensal` decimal(18,2) NOT NULL DEFAULT '0.00',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `ix_meta_data` (`data_meta`),
  KEY `ix_meta_func_data` (`funcional`,`data_meta`),
  KEY `fk_f_meta__produto` (`produto_id`),
  CONSTRAINT `fk_f_meta__d_estrutura` FOREIGN KEY (`funcional`) REFERENCES `d_estrutura` (`funcional`),
  CONSTRAINT `fk_f_meta__produto` FOREIGN KEY (`produto_id`) REFERENCES `d_produtos` (`id`),
  CONSTRAINT `fk_fm_cal` FOREIGN KEY (`data_meta`) REFERENCES `d_calendario` (`data`)
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `f_meta`
--

LOCK TABLES `f_meta` WRITE;
/*!40000 ALTER TABLE `f_meta` DISABLE KEYS */;
INSERT INTO `f_meta` VALUES (11,'2025-11-01','i010001',3,650000.00,'2025-11-09 02:05:04','2025-11-09 17:35:06'),(12,'2025-11-01','i020212',3,650000.00,'2025-11-09 02:05:04','2025-11-09 17:35:06'),(13,'2025-11-01','i020213',3,650000.00,'2025-11-09 02:05:04','2025-11-09 17:35:06'),(14,'2025-11-01','i010001',1,650000.00,'2025-11-09 02:05:04','2025-11-22 21:23:05');
/*!40000 ALTER TABLE `f_meta` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `f_pontos`
--

DROP TABLE IF EXISTS `f_pontos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `f_pontos` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `funcional` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `produto_id` int(11) NOT NULL,
  `meta` decimal(18,2) NOT NULL DEFAULT '0.00',
  `realizado` decimal(18,2) NOT NULL DEFAULT '0.00',
  `data_realizado` date DEFAULT NULL,
  `dt_atualizacao` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_fp_funcional` (`funcional`),
  KEY `idx_fp_produto` (`produto_id`),
  KEY `idx_fp_data_realizado` (`data_realizado`),
  CONSTRAINT `fk_fpontos_calendario` FOREIGN KEY (`data_realizado`) REFERENCES `d_calendario` (`data`) ON UPDATE CASCADE,
  CONSTRAINT `fk_fpontos_estrutura` FOREIGN KEY (`funcional`) REFERENCES `d_estrutura` (`funcional`) ON UPDATE CASCADE,
  CONSTRAINT `fk_fpontos_produto` FOREIGN KEY (`produto_id`) REFERENCES `d_produtos` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `f_pontos`
--

LOCK TABLES `f_pontos` WRITE;
/*!40000 ALTER TABLE `f_pontos` DISABLE KEYS */;
INSERT INTO `f_pontos` VALUES (5,'i010001',3,20.00,5.00,'2025-11-22','2025-11-22 21:05:38'),(6,'i010001',1,12.00,12.00,'2025-11-22','2025-11-22 21:05:38'),(7,'i020212',1,12.00,6.00,'2025-11-22','2025-11-22 21:05:38'),(8,'i020212',3,20.00,19.00,'2025-11-22','2025-11-22 21:05:38');
/*!40000 ALTER TABLE `f_pontos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `f_realizados`
--

DROP TABLE IF EXISTS `f_realizados`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `f_realizados` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `id_contrato` char(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `funcional` varchar(16) COLLATE utf8mb4_unicode_ci NOT NULL,
  `data_realizado` date NOT NULL,
  `realizado` decimal(18,2) NOT NULL DEFAULT '0.00',
  `produto_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_fr_data` (`data_realizado`),
  KEY `idx_fr_func_data` (`funcional`,`data_realizado`),
  KEY `idx_fr_contrato` (`id_contrato`),
  KEY `idx_fr_produto` (`produto_id`),
  CONSTRAINT `fk_fr_calendario` FOREIGN KEY (`data_realizado`) REFERENCES `d_calendario` (`data`) ON UPDATE CASCADE,
  CONSTRAINT `fk_fr_estrutura` FOREIGN KEY (`funcional`) REFERENCES `d_estrutura` (`funcional`) ON UPDATE CASCADE,
  CONSTRAINT `fk_fr_produto` FOREIGN KEY (`produto_id`) REFERENCES `d_produtos` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=27 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `f_realizados`
--

LOCK TABLES `f_realizados` WRITE;
/*!40000 ALTER TABLE `f_realizados` DISABLE KEYS */;
INSERT INTO `f_realizados` VALUES (1,'0000000001','i010001','2025-11-01',14000.00,1),(2,'0000000002','i010001','2025-11-02',14000.00,1),(3,'0000000003','i010001','2025-11-03',14000.00,1),(4,'0000000004','i010001','2025-11-04',14000.00,1),(5,'0000000005','i010001','2025-11-05',14000.00,1),(6,'0000000006','i010001','2025-11-06',14000.00,1),(7,'0000000007','i010001','2025-11-07',14000.00,1),(8,'0000000008','i010001','2025-11-08',14000.00,1),(9,'0000000009','i020212','2025-11-01',16000.00,1),(10,'0000000010','i020212','2025-11-02',16000.00,1),(11,'0000000011','i020212','2025-11-03',16000.00,1),(12,'0000000012','i020212','2025-11-04',16000.00,1),(13,'0000000013','i020212','2025-11-05',16000.00,1),(14,'0000000014','i020212','2025-11-06',16000.00,1),(15,'0000000015','i020212','2025-11-07',16000.00,1),(16,'0000000016','i020212','2025-11-08',16000.00,1),(17,'0000000017','i020213','2025-11-01',18000.00,2),(18,'0000000018','i020213','2025-11-02',18000.00,2),(19,'0000000019','i020213','2025-11-03',18000.00,2),(20,'0000000020','i020213','2025-11-04',18000.00,2),(21,'0000000021','i020213','2025-11-05',18000.00,2),(22,'0000000022','i020213','2025-11-06',18000.00,2),(23,'0000000023','i020213','2025-11-07',18000.00,2),(25,'0000000025','i010001','2025-11-08',18000.00,3),(26,'0000000025','i010001','2025-11-08',650000.00,3);
/*!40000 ALTER TABLE `f_realizados` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `f_variavel`
--

DROP TABLE IF EXISTS `f_variavel`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `f_variavel` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `funcional` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `meta` decimal(18,2) NOT NULL DEFAULT '0.00',
  `variavel` decimal(18,2) NOT NULL DEFAULT '0.00',
  `dt_atualizacao` date NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_fv_funcional` (`funcional`),
  KEY `idx_fv_dt` (`dt_atualizacao`),
  CONSTRAINT `fk_f_variavel_calendario` FOREIGN KEY (`dt_atualizacao`) REFERENCES `d_calendario` (`data`) ON UPDATE CASCADE,
  CONSTRAINT `fk_f_variavel_estrutura` FOREIGN KEY (`funcional`) REFERENCES `d_estrutura` (`funcional`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `f_variavel`
--

LOCK TABLES `f_variavel` WRITE;
/*!40000 ALTER TABLE `f_variavel` DISABLE KEYS */;
INSERT INTO `f_variavel` VALUES (1,'i010001',1000.00,800.00,'2025-11-15'),(2,'i020212',1100.00,913.00,'2025-11-15'),(3,'i020213',1200.00,1272.00,'2025-11-15'),(4,'i020219',1300.00,1391.00,'2025-11-15'),(5,'i020220',1000.00,1624.00,'2025-11-22');
/*!40000 ALTER TABLE `f_variavel` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `familia`
--

DROP TABLE IF EXISTS `familia`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `familia` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nm_familia` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_familia` (`nm_familia`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `familia`
--

LOCK TABLES `familia` WRITE;
/*!40000 ALTER TABLE `familia` DISABLE KEYS */;
INSERT INTO `familia` VALUES (3,'Captação'),(2,'Crédito'),(1,'Relacionamento');
/*!40000 ALTER TABLE `familia` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `indicador`
--

DROP TABLE IF EXISTS `indicador`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `indicador` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nm_indicador` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `familia_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_indicador` (`nm_indicador`),
  KEY `indicador_familia_FK` (`familia_id`),
  CONSTRAINT `indicador_familia_FK` FOREIGN KEY (`familia_id`) REFERENCES `familia` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `indicador`
--

LOCK TABLES `indicador` WRITE;
/*!40000 ALTER TABLE `indicador` DISABLE KEYS */;
INSERT INTO `indicador` VALUES (1,'Cash - Contas a Pagar e Contas a Receber',3),(2,'Novas Aquisições Alelo',3),(3,'Produção de Crédito PJ',2),(4,'Captação Bruta',1);
/*!40000 ALTER TABLE `indicador` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `omega_chamados`
--

DROP TABLE IF EXISTS `omega_chamados`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `omega_chamados` (
  `id` varchar(60) COLLATE utf8mb4_unicode_ci NOT NULL,
  `subject` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `company` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `product_id` varchar(80) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `product_label` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `family` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `section` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `queue` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `category` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(40) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `priority` varchar(40) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `opened` datetime DEFAULT NULL,
  `updated` datetime DEFAULT NULL,
  `due_date` datetime DEFAULT NULL,
  `requester_id` varchar(60) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `owner_id` varchar(60) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `team_id` varchar(60) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `history` longtext COLLATE utf8mb4_unicode_ci,
  `diretoria` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `gerencia` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `agencia` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `gerente_gestao` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `gerente` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `credit` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `attachment` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_omega_chamados_status` (`status`),
  KEY `idx_omega_chamados_team` (`team_id`),
  KEY `idx_omega_chamados_requester` (`requester_id`),
  KEY `idx_omega_chamados_owner` (`owner_id`),
  CONSTRAINT `fk_omega_chamados_owner` FOREIGN KEY (`owner_id`) REFERENCES `omega_usuarios` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_omega_chamados_requester` FOREIGN KEY (`requester_id`) REFERENCES `omega_usuarios` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_omega_chamados_status` FOREIGN KEY (`status`) REFERENCES `omega_status` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_omega_chamados_team` FOREIGN KEY (`team_id`) REFERENCES `omega_departamentos` (`departamento_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `omega_chamados`
--

LOCK TABLES `omega_chamados` WRITE;
/*!40000 ALTER TABLE `omega_chamados` DISABLE KEYS */;
INSERT INTO `omega_chamados` VALUES ('1','Fila • Capital de Giro Flex • X-Burguer','X-Burguer','capital_giro_flex','Capital de Giro Flex','Crédito PJ','Crédito','Metas','Fila','aberto','media','2025-11-06 13:56:05','2025-11-06 13:56:05',NULL,'usr-xburguer',NULL,'pobj','2025-11-06T13:56:05.052Z::usr-xburguer::Abertura do chamado::uioyj9iuio::aberto','8607',NULL,NULL,NULL,NULL,NULL,NULL),('OME-2025-0001','Abertura de conta PJ','Casa das Flores LTDA','captacao_bruta','Captação Bruta (CDB, Isentos, Fundos, Corretora e Previdência)','CAPTAÇÃO','Serviços financeiros','pobj','Recuperação de Crédito','aberto','media','2025-01-15 09:30:00','2025-01-15 09:45:00','2025-01-22 18:00:00','usr-01','usr-02','pobj','2025-01-15T09:30:00Z::usr-01::Abertura do chamado::Cliente solicitou suporte inicial.::aberto||2025-01-15T09:45:00Z::usr-02::Atendimento iniciado::Contato registrado para retorno.::em_atendimento','D.R. VAREJO DIGITAL','Regional Norte Digital','Agência 0123 Centro Digital','Maria Oliveira','João Falavinha','200000.00','briefing.pdf'),('OME-2025-0002','Migração de carteira PJ','Metalúrgica Horizonte LTDA','capital_giro_flex','Capital de Giro Flex','CAPTAÇÃO','Crédito','pobj','Centralização de Caixa (Cash)','em_atendimento','alta','2025-02-03 11:15:00','2025-02-04 16:20:00','2025-02-10 18:00:00','usr-05','usr-06','pobj','2025-02-03T11:15:00Z::usr-05::Abertura do chamado::Cliente solicitou transferência de contas.::aberto||2025-02-03T11:45:00Z::usr-06::Atendimento iniciado::Checklist enviado para validação.::em_atendimento||2025-02-04T16:20:00Z::usr-07::Aprovação do supervisor::Reforçar urgência devido ao fechamento de folha.::em_atendimento','D.R. VAREJO DIGITAL','Regional Norte Digital','Agência 0456 Distrito Tech','Maria Oliveira','João Falavinha','350000.00','checklist.pdf'),('OME-2025-0003','Revisão de meta de cartões','Loja Futuro ME','maquininha_plus','Maquininha Plus','CAPTAÇÃO','Recebíveis','pobj','Cartões','aguardando','media','2025-03-12 08:20:00','2025-03-15 10:45:00','2025-03-25 18:00:00','usr-02','usr-06','pobj','2025-03-12T08:20:00Z::usr-02::Abertura do chamado::Solicitada revisão após reorganização de carteira.::aberto||2025-03-14T09:05:00Z::usr-06::Comentário do analista::Planilha de suporte requisitada para ajuste.::aguardando','D.R. VAREJO DIGITAL','Regional Norte Digital','Agência 0789 Expansão Digital','Maria Oliveira','João Falavinha','120000.00',NULL),('OME-2025-0004','Campanha InvestFácil','Construtora Evoluir S/A','antecipacao_recebiveis','Antecipação de Recebíveis PJ','CAPTAÇÃO','Recebíveis','pobj','InvestFácil','resolvido','baixa','2025-01-28 14:00:00','2025-02-02 17:30:00','2025-02-05 18:00:00','usr-03','usr-06','pobj','2025-01-28T14:00:00Z::usr-03::Abertura do chamado::Cliente precisa de onboarding do produto.::aberto||2025-01-30T10:00:00Z::usr-06::Status atualizado::Documentação conferida e enviada para aprovação.::em_atendimento||2025-02-02T17:30:00Z::usr-06::Chamado resolvido::Integração concluída sem pendências.::resolvido','D.R. VAREJO DIGITAL','Regional Norte Digital','Agência 0456 Distrito Tech','Maria Oliveira','João Falavinha','95000.00','manual-investfacil.pdf'),('OME-2025-0005','Suporte emergencial Cash','Start PJ Digital','capital_giro_flex','Capital de Giro Flex','CAPTAÇÃO','Serviços financeiros','pobj','Sucesso de Equipe Crédito','aberto','critica','2025-04-05 09:40:00','2025-04-05 09:40:00','2025-04-12 12:00:00','usr-01',NULL,'pobj','2025-04-05T09:40:00Z::usr-01::Abertura do chamado::Falha na autorização de proposta digital para cliente estratégico.::aberto','D.R. VAREJO DIGITAL','Regional Norte Digital','Agência 0123 Centro Digital','Maria Oliveira','João Falavinha','48000.00',NULL),('OME-2025-0006','Revisão de limites PJ','Comércio do Centro LTDA','captacao_bruta','Captação Bruta (CDB, Isentos, Fundos, Corretora e Previdência)','CAPTAÇÃO','Serviços financeiros','pobj','Cartões','aguardando','media','2025-10-02 10:15:00','2025-10-02 10:15:00','2025-10-09 18:00:00','usr-xburguer','usr-02','pobj','2025-10-02T10:15:00Z::usr-xburguer::Abertura do chamado::Solicitou ajuste de limites para carteira prioritária.::aberto||2025-10-04T14:25:00Z::usr-02::Comentário do analista::Avaliação preliminar concluída, aguardando documentos.::aguardando','D.R. VAREJO DIGITAL','Regional Norte Digital','Agência 0123 Centro Digital','Maria Oliveira','X-Burguer','180000.00','limites.pdf'),('OME-2025-0007','Ajuste de metas outubro','Serviços Horizonte ME','prod_credito_pj','Produção de Crédito PJ','CAPTAÇÃO','Crédito','pobj','Metas','em_atendimento','alta','2025-10-05 09:05:00','2025-10-07 11:20:00','2025-10-11 18:00:00','usr-xburguer','usr-06','pobj','2025-10-05T09:05:00Z::usr-xburguer::Abertura do chamado::Solicita redistribuição de metas após nova carteira.::aberto||2025-10-07T11:20:00Z::usr-06::Atualização do atendimento::Revisão em andamento junto à área de metas.::em_atendimento','D.R. VAREJO DIGITAL','Regional Norte Digital','Agência 0123 Centro Digital','Maria Oliveira','X-Burguer','250000.00','ajuste-metas.xlsx');
/*!40000 ALTER TABLE `omega_chamados` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `omega_departamentos`
--

DROP TABLE IF EXISTS `omega_departamentos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `omega_departamentos` (
  `departamento` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `departamento_id` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ordem_departamento` int(11) DEFAULT NULL,
  `tipo` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ordem_tipo` int(11) DEFAULT NULL,
  PRIMARY KEY (`departamento_id`),
  UNIQUE KEY `uq_omega_departamento_nome_tipo` (`departamento`,`tipo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `omega_departamentos`
--

LOCK TABLES `omega_departamentos` WRITE;
/*!40000 ALTER TABLE `omega_departamentos` DISABLE KEYS */;
INSERT INTO `omega_departamentos` VALUES ('','',0,'',0),('Visão Global','0',0,'Visão geral',0),('Encarteiramento','encarteiramento',1,'Fila',1),('Matriz','matriz',5,'Fila',5),('Metas','metas',2,'Fila',2),('Orçamento','orcamento',3,'Fila',3),('Outros','outros',6,'Fila',6),('POBJ','pobj',4,'Fila',4);
/*!40000 ALTER TABLE `omega_departamentos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `omega_status`
--

DROP TABLE IF EXISTS `omega_status`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `omega_status` (
  `id` varchar(40) COLLATE utf8mb4_unicode_ci NOT NULL,
  `label` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'neutral',
  `descricao` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ordem` int(11) DEFAULT NULL,
  `departamento_id` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_omega_status_departamento` (`departamento_id`),
  CONSTRAINT `fk_omega_status_departamento` FOREIGN KEY (`departamento_id`) REFERENCES `omega_departamentos` (`departamento_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `omega_status`
--

LOCK TABLES `omega_status` WRITE;
/*!40000 ALTER TABLE `omega_status` DISABLE KEYS */;
INSERT INTO `omega_status` VALUES ('aberto','Aberto','neutral','Chamado aberto e aguardando atendimento.',1,'0'),('aguardando','Aguardando','warning','Chamado aguardando informações ou aprovação.',2,'0'),('cancelado','Cancelado','danger','Chamado cancelado.',5,'0'),('em_atendimento','Em atendimento','progress','Equipe atuando no chamado.',3,'0'),('resolvido','Resolvido','success','Chamado concluído.',4,'0');
/*!40000 ALTER TABLE `omega_status` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `omega_usuarios`
--

DROP TABLE IF EXISTS `omega_usuarios`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `omega_usuarios` (
  `id` varchar(40) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nome` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `funcional` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `matricula` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cargo` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `usuario` tinyint(1) DEFAULT '1',
  `analista` tinyint(1) DEFAULT '0',
  `supervisor` tinyint(1) DEFAULT '0',
  `admin` tinyint(1) DEFAULT '0',
  `encarteiramento` tinyint(1) DEFAULT '0',
  `meta` tinyint(1) DEFAULT '0',
  `orcamento` tinyint(1) DEFAULT '0',
  `pobj` tinyint(1) DEFAULT '0',
  `matriz` tinyint(1) DEFAULT '0',
  `outros` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `omega_usuarios`
--

LOCK TABLES `omega_usuarios` WRITE;
/*!40000 ALTER TABLE `omega_usuarios` DISABLE KEYS */;
INSERT INTO `omega_usuarios` VALUES ('usr-01','João Falavinha','012345','012345','Gerente de Relacionamento',1,0,0,0,0,1,0,1,0,0),('usr-02','Ana Souza','045678','045678','Gerente Regional',1,1,0,0,1,1,0,0,0,0),('usr-03','Bruno Pereira','078912','078912','Gerente de Gestão',1,0,1,0,0,0,0,1,0,0),('usr-04','Juliana Costa','078913','078913','Gerente Corporate',1,1,0,0,0,0,0,1,0,0),('usr-05','Maria Oliveira','012346','012346','Gestora de Carteira',1,0,1,0,1,1,0,1,0,0),('usr-06','Equipe Matriz','000001','000001','Analista Matriz',1,1,0,0,0,0,1,0,1,1),('usr-07','Carla Supervisor','045679','045679','Supervisora POBJ',1,0,1,0,0,0,0,1,0,0),('usr-xburguer','X-Burguer','0897654','0897654','Gerente de Relacionamento',1,0,0,0,0,0,0,1,0,0);
/*!40000 ALTER TABLE `omega_usuarios` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `regionais`
--

DROP TABLE IF EXISTS `regionais`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `regionais` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `diretoria_id` int(10) unsigned NOT NULL,
  `nome` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_regional_diretoria_nome` (`diretoria_id`,`nome`(191)),
  CONSTRAINT `fk_regionais_diretoria` FOREIGN KEY (`diretoria_id`) REFERENCES `diretorias` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=8487 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `regionais`
--

LOCK TABLES `regionais` WRITE;
/*!40000 ALTER TABLE `regionais` DISABLE KEYS */;
INSERT INTO `regionais` VALUES (8486,8607,'SP Sul e Oeste','2025-11-25 01:53:23',NULL);
/*!40000 ALTER TABLE `regionais` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `segmentos`
--

DROP TABLE IF EXISTS `segmentos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `segmentos` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `nome` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_segmentos_nome` (`nome`(191))
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `segmentos`
--

LOCK TABLES `segmentos` WRITE;
/*!40000 ALTER TABLE `segmentos` DISABLE KEYS */;
INSERT INTO `segmentos` VALUES (1,'Empresas','2025-11-25 01:49:34','2025-11-25 01:52:08');
/*!40000 ALTER TABLE `segmentos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `subindicador`
--

DROP TABLE IF EXISTS `subindicador`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `subindicador` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `indicador_id` int(11) NOT NULL,
  `nm_subindicador` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_indicador_sub` (`indicador_id`,`nm_subindicador`),
  CONSTRAINT `subindicador_ibfk_1` FOREIGN KEY (`indicador_id`) REFERENCES `indicador` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `subindicador`
--

LOCK TABLES `subindicador` WRITE;
/*!40000 ALTER TABLE `subindicador` DISABLE KEYS */;
INSERT INTO `subindicador` VALUES (2,1,'Contas a Pagar'),(3,1,'Contas a Receber'),(5,3,'Linha PJ'),(1,4,'CDB e Isentos');
/*!40000 ALTER TABLE `subindicador` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping routines for database 'pobj_refactor'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-11-26 19:42:26
