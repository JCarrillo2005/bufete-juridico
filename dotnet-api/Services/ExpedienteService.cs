using dotnet_api.Models;
using dotnet_api.Services;
using System.Text.Json;

namespace dotnet_api.Services;
public class ExpedienteService
{
    private static readonly string[] CategoriasValidas = { "Civil", "Familiar", "Laboral" };

    private static readonly JsonSerializerOptions JsonOpciones = new(JsonSerializerDefaults.Web)
    {
        WriteIndented = true
    };

    private readonly object _candado = new();
    private readonly string _ruta;
    private readonly List<Expediente> _expedientes;

    public ExpedienteService(IWebHostEnvironment env)
    {
        var carpeta = Path.Combine(env.ContentRootPath, "Data");
        Directory.CreateDirectory(carpeta);
        _ruta = Path.Combine(carpeta, "expedientes.json");

        if (File.Exists(_ruta))
        {
            var json = File.ReadAllText(_ruta);
            _expedientes = JsonSerializer.Deserialize<List<Expediente>>(json, JsonOpciones) ?? new();
        }
        else
        {
            _expedientes = new();
        }

        // Compatibilidad: expedientes cerrados antes de existir la lista de cierres.
        var huboCambios = false;
        foreach (var e in _expedientes)
        {
            e.Cierres ??= new List<CierreRegistro>();
            if (e.Estado == Estados.Cerrado && e.Cierres.Count == 0 && e.FechaCierre != null)
            {
                e.Cierres.Add(new CierreRegistro
                {
                    Numero = 1,
                    FechaCierre = e.FechaCierre.Value,
                    MotivoCierre = e.MotivoCierre ?? string.Empty
                });
                huboCambios = true;
            }
        }

        if (huboCambios)
        {
            Guardar();
        }
    }

    public Expediente Crear(CrearExpedienteDto dto)
    {
        var errores = new Dictionary<string, string>();

        var solicitante = (dto.Solicitante ?? string.Empty).Trim();
        var descripcion = (dto.Descripcion ?? string.Empty).Trim();
        var responsable = (dto.Responsable ?? string.Empty).Trim();
        var categoria = string.IsNullOrWhiteSpace(dto.Categoria) ? null : dto.Categoria.Trim();

        if (solicitante.Length == 0)
            errores["solicitante"] = "Ingrese el nombre o alias de la persona solicitante; no puede estar vacío ni tener solo espacios.";
        else if (solicitante.Length > 100)
            errores["solicitante"] = "El nombre o alias no puede superar 100 caracteres.";

        if (descripcion.Length == 0)
            errores["descripcion"] = "Ingrese una descripción breve del asunto; no puede estar vacía ni tener solo espacios.";
        else if (descripcion.Length > 500)
            errores["descripcion"] = "La descripción no puede superar 500 caracteres.";

        if (responsable.Length == 0)
            errores["responsable"] = "Ingrese el nombre del responsable; no puede estar vacío ni tener solo espacios.";
        else if (responsable.Length > 100)
            errores["responsable"] = "El nombre del responsable no puede superar 100 caracteres.";

        if (categoria != null)
        {
            var coincidencia = CategoriasValidas
                .FirstOrDefault(c => c.Equals(categoria, StringComparison.OrdinalIgnoreCase));
            if (coincidencia == null)
                errores["categoria"] = "La categoría debe ser Civil, Familiar o Laboral, o dejarse vacía.";
            else
                categoria = coincidencia;
        }

        if (errores.Count > 0)
            throw new ValidacionException(errores);

        lock (_candado)
        {
            var ahora = DateTimeOffset.Now;
            var expediente = new Expediente
            {
                Id = $"EXP-{_expedientes.Count + 1:D4}",
                Solicitante = solicitante,
                Descripcion = descripcion,
                Responsable = responsable,
                Categoria = categoria,
                Estado = Estados.Abierto,
                FechaApertura = ahora
            };

            expediente.Historial.Add(new HistorialEntrada
            {
                Id = 1,
                Tipo = TiposHistorial.Apertura,
                Fecha = ahora,
                Descripcion = "Expediente abierto.",
                EstadoNuevo = Estados.Abierto
            });

            _expedientes.Add(expediente);
            Guardar();
            return expediente;
        }
    }

    public List<ExpedienteResumenDto> Listar(string? busqueda, string? estado)
    {
        lock (_candado)
        {
            IEnumerable<Expediente> consulta = _expedientes;

            if (!string.IsNullOrWhiteSpace(busqueda))
            {
                var termino = busqueda.Trim();
                consulta = consulta.Where(e =>
                    e.Id.Contains(termino, StringComparison.OrdinalIgnoreCase) ||
                    e.Solicitante.Contains(termino, StringComparison.OrdinalIgnoreCase));
            }

            if (!string.IsNullOrWhiteSpace(estado))
            {
                var est = estado.Trim();
                consulta = consulta.Where(e => e.Estado.Equals(est, StringComparison.OrdinalIgnoreCase));
            }

            return consulta
                .OrderByDescending(e => e.FechaApertura)
                .Select(e => new ExpedienteResumenDto
                {
                    Id = e.Id,
                    Solicitante = e.Solicitante,
                    Responsable = e.Responsable,
                    Estado = e.Estado,
                    Categoria = e.Categoria,
                    FechaApertura = e.FechaApertura
                })
                .ToList();
        }
    }

    public Expediente Obtener(string id)
    {
        lock (_candado)
        {
            return BuscarOFallar(id);
        }
    }

    public Expediente AgregarActividad(string id, AgregarActividadDto dto)
    {
        var descripcion = (dto.Descripcion ?? string.Empty).Trim();
        var tipo = string.IsNullOrWhiteSpace(dto.TipoActividad) ? null : dto.TipoActividad.Trim();

        var errores = new Dictionary<string, string>();
        if (descripcion.Length == 0)
            errores["descripcion"] = "Ingrese la descripción de la actividad; no puede estar vacía ni tener solo espacios.";
        else if (descripcion.Length > 500)
            errores["descripcion"] = "La descripción no puede superar 500 caracteres.";

        if (tipo != null && tipo.Length > 50)
            errores["tipoActividad"] = "El tipo de actividad no puede superar 50 caracteres.";

        lock (_candado)
        {
            var expediente = BuscarOFallar(id);

            if (expediente.Estado == Estados.Cerrado)
                throw new ReglaNegocioException("El expediente está cerrado y no admite nuevas actividades.");

            if (errores.Count > 0)
                throw new ValidacionException(errores);

            expediente.Historial.Add(new HistorialEntrada
            {
                Id = expediente.Historial.Count + 1,
                Tipo = TiposHistorial.Actividad,
                Fecha = DateTimeOffset.Now,
                Descripcion = descripcion,
                TipoActividad = tipo
            });

            Guardar();
            return expediente;
        }
    }

    public Expediente CambiarEstado(string id, CambiarEstadoDto dto)
    {
        var solicitado = (dto.NuevoEstado ?? string.Empty).Trim();
        var motivo = (dto.MotivoCierre ?? string.Empty).Trim();

        var nuevoEstado = Estados.Todos
            .FirstOrDefault(e => e.Equals(solicitado, StringComparison.OrdinalIgnoreCase));

        if (nuevoEstado == null)
        {
            throw new ValidacionException(new Dictionary<string, string>
            {
                ["nuevoEstado"] = "Indique un estado válido: Abierto, En seguimiento o Cerrado."
            });
        }

        lock (_candado)
        {
            var expediente = BuscarOFallar(id);

            if (expediente.Estado == Estados.Cerrado)
                throw new ReglaNegocioException(
                    "El expediente está cerrado y no admite cambios de estado. " +
                    "Para retomar el seguimiento use la acción Reabrir expediente.");

            var anterior = expediente.Estado;
            var ahora = DateTimeOffset.Now;
            string? motivoHistorial = null;

            if (anterior == Estados.Abierto && nuevoEstado == Estados.EnSeguimiento)
            {
                expediente.Estado = Estados.EnSeguimiento;
            }
            else if (anterior == Estados.EnSeguimiento && nuevoEstado == Estados.Cerrado)
            {
                if (motivo.Length == 0)
                {
                    throw new ValidacionException(new Dictionary<string, string>
                    {
                        ["motivoCierre"] = "Ingrese el motivo de cierre; no puede estar vacío ni tener solo espacios."
                    });
                }

                if (motivo.Length > 500)
                {
                    throw new ValidacionException(new Dictionary<string, string>
                    {
                        ["motivoCierre"] = "El motivo de cierre no puede superar 500 caracteres."
                    });
                }

                // Debe haber al menos una actividad desde la última reapertura
                // (o desde el inicio, si nunca se ha reabierto).
                if (!HayActividadDesdeUltimaReapertura(expediente))
                {
                    var mensaje = expediente.Cierres.Count == 0
                        ? "Para cerrar el expediente debe registrar al menos una actividad."
                        : "Para cerrar de nuevo el expediente debe registrar al menos una actividad después de la reapertura.";
                    throw new ReglaNegocioException(mensaje);
                }

                expediente.Estado = Estados.Cerrado;
                expediente.FechaCierre = ahora;
                expediente.MotivoCierre = motivo;
                motivoHistorial = motivo;

                expediente.Cierres.Add(new CierreRegistro
                {
                    Numero = expediente.Cierres.Count + 1,
                    FechaCierre = ahora,
                    MotivoCierre = motivo
                });
            }
            else
            {
                throw new ReglaNegocioException(
                    $"No se puede pasar de \"{anterior}\" a \"{nuevoEstado}\". " +
                    "El flujo permitido es Abierto → En seguimiento → Cerrado.");
            }

            expediente.Historial.Add(new HistorialEntrada
            {
                Id = expediente.Historial.Count + 1,
                Tipo = TiposHistorial.CambioEstado,
                Fecha = ahora,
                Descripcion = nuevoEstado == Estados.Cerrado
                    ? $"Cambio de estado: {anterior} → {nuevoEstado}. Motivo: {motivo}"
                    : $"Cambio de estado: {anterior} → {nuevoEstado}.",
                EstadoAnterior = anterior,
                EstadoNuevo = nuevoEstado,
                Motivo = motivoHistorial
            });

            Guardar();
            return expediente;
        }
    }

    public Expediente Reabrir(string id, ReabrirExpedienteDto dto)
    {
        var motivo = (dto.Motivo ?? string.Empty).Trim();

        lock (_candado)
        {
            var expediente = BuscarOFallar(id);

            if (expediente.Estado != Estados.Cerrado)
            {
                throw new ReglaNegocioException(
                    $"Solo se puede reabrir un expediente cerrado. El expediente está \"{expediente.Estado}\".");
            }

            if (motivo.Length == 0)
            {
                throw new ValidacionException(new Dictionary<string, string>
                {
                    ["motivo"] = "Ingrese el motivo de la reapertura; no puede estar vacío ni tener solo espacios."
                });
            }

            if (motivo.Length > 500)
            {
                throw new ValidacionException(new Dictionary<string, string>
                {
                    ["motivo"] = "El motivo de la reapertura no puede superar 500 caracteres."
                });
            }

            var ahora = DateTimeOffset.Now;

            // El cierre anterior se conserva; solo se le anota la reapertura.
            var ultimoCierre = expediente.Cierres.LastOrDefault();
            if (ultimoCierre != null)
            {
                ultimoCierre.FechaReapertura = ahora;
                ultimoCierre.MotivoReapertura = motivo;
            }

            expediente.Estado = Estados.EnSeguimiento;
            expediente.FechaCierre = null;
            expediente.MotivoCierre = null;

            expediente.Historial.Add(new HistorialEntrada
            {
                Id = expediente.Historial.Count + 1,
                Tipo = TiposHistorial.CambioEstado,
                Fecha = ahora,
                Descripcion = $"Reapertura: {Estados.Cerrado} → {Estados.EnSeguimiento}. Motivo: {motivo}",
                EstadoAnterior = Estados.Cerrado,
                EstadoNuevo = Estados.EnSeguimiento,
                Motivo = motivo
            });

            Guardar();
            return expediente;
        }
    }

    // Se llama siempre dentro del lock.
    private static bool HayActividadDesdeUltimaReapertura(Expediente expediente)
    {
        var indiceReapertura = expediente.Historial.FindLastIndex(h =>
            h.Tipo == TiposHistorial.CambioEstado && h.EstadoAnterior == Estados.Cerrado);

        for (var i = indiceReapertura + 1; i < expediente.Historial.Count; i++)
        {
            if (expediente.Historial[i].Tipo == TiposHistorial.Actividad)
                return true;
        }

        return false;
    }

    // Se llama siempre dentro del lock.
    private Expediente BuscarOFallar(string id)
    {
        var expediente = _expedientes
            .FirstOrDefault(e => e.Id.Equals(id?.Trim(), StringComparison.OrdinalIgnoreCase));

        if (expediente == null)
            throw new NoEncontradoException($"No existe un expediente con el identificador \"{id}\".");

        return expediente;
    }

    // Se llama siempre dentro del lock. Escribe a un temporal y reemplaza, para no corromper el archivo.
    private void Guardar()
    {
        var json = JsonSerializer.Serialize(_expedientes, JsonOpciones);
        var temporal = _ruta + ".tmp";
        File.WriteAllText(temporal, json);
        File.Move(temporal, _ruta, overwrite: true);
    }
}