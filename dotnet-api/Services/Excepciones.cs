namespace dotnet_api.Services;

// 400: datos faltantes o inválidos. Clave = campo, valor = qué corregir.
public class ValidacionException : Exception
{
    public Dictionary<string, string> Errores { get; }

    public ValidacionException(Dictionary<string, string> errores)
        : base("Hay datos que debe corregir.")
    {
        Errores = errores;
    }
}

// 409: la acción no está permitida por las reglas del negocio.
public class ReglaNegocioException : Exception
{
    public ReglaNegocioException(string mensaje) : base(mensaje) { }
}

// 404: el expediente no existe.
public class NoEncontradoException : Exception
{
    public NoEncontradoException(string mensaje) : base(mensaje) { }
}