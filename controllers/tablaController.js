const path = require('path');
const db = require('../models/db');
const sql = require('mssql');
const { json } = require('stream/consumers');
const express = require('express');
const xlsx = require('xlsx');
const ExcelJS = require('exceljs');

const proyectos = [
    { equipo: "Desarrollo", nombre: "Nueva API", estado: "Sin Problemas" },
    { equipo: "Infraestructura", nombre: "Migración de Servidores", estado: "Alerta de Retraso" },
    { equipo: "Diseño", nombre: "Rediseño de Plataforma", estado: "Necesita Intervención del CEO" }
];

// Obtener lista de proyectos
exports.obtenerProyectos = async (req, res) => {
    try {
        res.json(proyectos);
    } catch (error) {
        console.error("Error al obtener proyectos:", error);
        res.status(500).send("Error en el servidor");
    }
};
