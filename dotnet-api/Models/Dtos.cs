namespace dotnet_api.Models;

public class CrearExpedienteDto
{
    public string? Solicitante { get; set; }
    public string? Descripcion { get; set; }
    public string? Responsable { get; set; }
    public string? Categoria { get; set; }
}

public class AgregarActividadDto
{
    public string? Descripcion { get; set; }
    public string? TipoActividad { get; set; }
}

public class CambiarEstadoDto
{
    public string? NuevoEstado { get; set; }
    public string? MotivoCierre { get; set; }
}

public class ExpedienteResumenDto
{
    public string Id { get; set; } = string.Empty;
    public string Solicitante { get; set; } = string.Empty;
    public string Responsable { get; set; } = string.Empty;
    public string Estado { get; set; } = string.Empty;
    public string? Categoria { get; set; }
    public DateTimeOffset FechaApertura { get; set; }
}