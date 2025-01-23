' Crear producto
' NOTA: para editar producto, sólo hay que especificar el código de producto en la URL y usar un PUT

Dim productData As Object
Set productData = CreateObject("Scripting.Dictionary")
productData.Add "code", "ACME-01-003"
productData.Add "price", 90.5
productData.Add "description", "Do-it yourself tornado kit Acme"
productData.Add "family_id", 1
' add additional product data as needed

Dim jsonProductData As String
jsonProductData = JsonConverter.ConvertToJson(productData)

Dim requestUrl As String
requestUrl = "https://hub.handy.la/api/v2/product"

Dim authHeader As String
authHeader = "Authorization: Bearer YOUR_TOKEN_HERE"

Dim request As Object
Set request = CreateObject("WinHttp.WinHttpRequest.5.1")
request.Open "POST", requestUrl, False
request.SetRequestHeader "Content-Type", "application/json"
request.SetRequestHeader "Accept", "application/json"
request.SetRequestHeader "Authorization", authHeader
request.Send jsonProductData

Dim responseCode As Integer
responseCode = request.Status

If responseCode = 429 Then
    ' rate limit reached, wait 60 seconds and try again up to 3 times
    Dim numRetries As Integer
    numRetries = 0
    Do While numRetries < 3
        Sleep 60000 ' wait 60 seconds
        request.Send jsonProductData
        responseCode = request.Status
        If responseCode <> 429 Then Exit Do
        numRetries = numRetries + 1
    Loop
End If

Dim jsonResponse As String
jsonResponse = request.ResponseText

' parse the response JSON and retrieve any relevant data
Dim response As Object
Set response = JsonConverter.ConvertFromJson(jsonResponse)
