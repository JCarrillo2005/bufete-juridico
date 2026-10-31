using dotnet_api.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddSingleton<ExpedienteService>();

builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
        policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod());
});

var app = builder.Build();

// Convierte las excepciones de negocio en respuestas JSON con mensajes comprensibles.
app.Use(async (context, next) =>
{
    try
    {
        await next();
    }
    catch (ValidacionException ex)
    {
        context.Response.StatusCode = StatusCodes.Status400BadRequest;
        await context.Response.WriteAsJsonAsync(new { mensaje = ex.Message, errores = ex.Errores });
    }
    catch (ReglaNegocioException ex)
    {
        context.Response.StatusCode = StatusCodes.Status409Conflict;
        await context.Response.WriteAsJsonAsync(new { mensaje = ex.Message });
    }
    catch (NoEncontradoException ex)
    {
        context.Response.StatusCode = StatusCodes.Status404NotFound;
        await context.Response.WriteAsJsonAsync(new { mensaje = ex.Message });
    }
});

app.UseSwagger();
app.UseSwaggerUI();

app.UseCors("Frontend");
app.MapControllers();

app.Run();