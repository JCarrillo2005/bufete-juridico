using dotnet_api.Models;
using dotnet_api.Services;
using Microsoft.AspNetCore.Mvc;

namespace dotnet_api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ExpedientesController : ControllerBase
{
    private readonly ExpedienteService _servicio;

    public ExpedientesController(ExpedienteService servicio)
    {
        _servicio = servicio;
    }

    // GET api/expedientes?busqueda=maria&estado=Abierto
    [HttpGet]
    public ActionResult<List<ExpedienteResumenDto>> Listar([FromQuery] string? busqueda, [FromQuery] string? estado)
    {
        return Ok(_servicio.Listar(busqueda, estado));
    }

    // GET api/expedientes/EXP-0001
    [HttpGet("{id}")]
    public ActionResult<Expediente> Obtener(string id)
    {
        return Ok(_servicio.Obtener(id));
    }

    // POST api/expedientes
    [HttpPost]
    public ActionResult<Expediente> Crear([FromBody] CrearExpedienteDto dto)
    {
        var creado = _servicio.Crear(dto);
        return CreatedAtAction(nameof(Obtener), new { id = creado.Id }, creado);
    }

    // POST api/expedientes/EXP-0001/actividades
    [HttpPost("{id}/actividades")]
    public ActionResult<Expediente> AgregarActividad(string id, [FromBody] AgregarActividadDto dto)
    {
        return Ok(_servicio.AgregarActividad(id, dto));
    }

    // POST api/expedientes/EXP-0001/estado
    [HttpPost("{id}/estado")]
    public ActionResult<Expediente> CambiarEstado(string id, [FromBody] CambiarEstadoDto dto)
    {
        return Ok(_servicio.CambiarEstado(id, dto));
    }

    // POST api/expedientes/EXP-0001/reabrir
    [HttpPost("{id}/reabrir")]
    public ActionResult<Expediente> Reabrir(string id, [FromBody] ReabrirExpedienteDto dto)
    {
        return Ok(_servicio.Reabrir(id, dto));
    }
}