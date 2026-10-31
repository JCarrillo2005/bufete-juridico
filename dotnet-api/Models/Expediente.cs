namespace dotnet_api.Models;

public static class Estados
{
    public const string Abierto = "Abierto";
    public const string EnSeguimiento = "En seguimiento";
    public const string Cerrado = "Cerrado";

    public static readonly string[] Todos = { Abierto, EnSeguimiento, Cerrado };
}

public static class TiposHistorial
{
    public const string Apertura = "Apertura";
    public const string Actividad = "Actividad";
    public const string CambioEstado = "CambioEstado";
}

public class HistorialEntrada
{
    public int Id { get; set; }
    public string Tipo { get; set; } = string.Empty;
    public DateTimeOffset Fecha { get; set; }
    public string Descripcion { get; set; } = string.Empty;
    public string? TipoActividad { get; set; }
    public string? EstadoAnterior { get; set; }
    public string? EstadoNuevo { get; set; }
}

public class Expediente
{
    public string Id { get; set; } = string.Empty;
    public string Solicitante { get; set; } = string.Empty;
    public string Descripcion { get; set; } = string.Empty;
    public string Responsable { get; set; } = string.Empty;
    public string? Categoria { get; set; }
    public string Estado { get; set; } = Estados.Abierto;
    public DateTimeOffset FechaApertura { get; set; }
    public DateTimeOffset? FechaCierre { get; set; }
    public string? MotivoCierre { get; set; }
    public List<HistorialEntrada> Historial { get; set; } = new();
}