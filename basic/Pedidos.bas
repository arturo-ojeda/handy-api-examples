' Ejemplo de código para obtener pedidos de Handy

Option Explicit

Private Sub Form_Load()
    Dim token As String
    token = "<your_bearer_token>"
    Dim startDate As String
    startDate = "01/01/2022 00:00:00"
    Dim endDate As String
    endDate = "31/01/2022 23:59:59"
    Dim url As String
    url = "https://hub.handy.la/api/v2/salesOrder"
    If startDate <> "" And endDate <> "" Then
        url = url & "?startDate=" & startDate & "&endDate=" & endDate
    End If
    Dim salesOrders As Object
    Set salesOrders = GetSalesOrders(url, token)
    ' Print the sales orders as a JSON array
    Debug.Print JsonConverter.ConvertToJson(salesOrders("salesOrders"))
End Sub

Private Function GetSalesOrders(ByVal url As String, ByVal token As String) As Object
    ' Set up the HTTP request
    Dim request As MSXML2.XMLHTTP60
    Set request = New MSXML2.XMLHTTP60
    request.Open "GET", url, False
    
    ' Set the request headers
    request.setRequestHeader "Content-Type", "application/json"
    request.setRequestHeader "Authorization", "Bearer " & token
    
    ' Send the request
    request.send
    
    ' Handle the response and any errors
    Dim response As String
    Dim status As Long
    Dim retryCount As Integer
    retryCount = 0
    Do
        response = ""
        request.send
        
        ' Get the response and status code
        response = request.responseText
        status = request.Status
        
        If status = 401 Then
            MsgBox "Error " & status & ": Unauthorized"
            Exit Function
        ElseIf status = 429 And retryCount < 3 Then
            retryCount = retryCount + 1
            Wait 60 ' Wait 60 seconds
        Else
            Exit Do
        End If
    Loop
    
    ' Check for other errors
    If status <> 200 Then
        MsgBox "Error " & status & ": " & request.statusText & vbCrLf & response
        Exit Function
    End If
    
    ' Parse the JSON response
    Dim json As Object
    Set json = JsonConverter.ParseJson(response)
    
    ' Retrieve the sales orders
    Set GetSalesOrders = json
    
    ' Check for pagination
    If Not json("pagination") Is Nothing Then
        Dim pagination As Object
        Set pagination = json("pagination")
        While Not IsNull(pagination("nextPage"))
            ' Send the next request
            url = pagination("nextPage")
            Set request = New MSXML2.XMLHTTP60
            request.Open "GET", url, False
            request.setRequestHeader "Content-Type", "application/json"
            request.setRequestHeader "Authorization", "Bearer " & token
            request.send
            
            ' Get the response and status code
            response = request.responseText
            status = request.Status
            
            If status = 401 Then
                MsgBox "Error " & status & ": Unauthorized"
                Exit Function
            ElseIf status = 429 And retryCount < 3 Then
                retryCount = retryCount + 1
                Wait 60 ' Wait 60 seconds
            ElseIf status <> 200 Then
                MsgBox "Error " & status & ": " & request.statusText & vbCrLf & response
                Exit Function
            Else
                ' Parse the JSON response and append to salesOrders
                Set json = JsonConverter.ParseJson(response)
                Set GetSalesOrders = MergeJsonArrays(GetSalesOrders, json)
            End If
        Wend
    End If
End Function

Private Function MergeJsonArrays(ByVal json1 As Object, ByVal json2 As Object) As Object
    Dim salesOrders1 As Object
    Set salesOrders1 = json1("salesOrders")
    Dim salesOrders2 As Object
    Set salesOrders2 = json2("salesOrders")
    Dim salesOrders As Object
    Set salesOrders = JsonConverter.CreateJsonArray
    Dim i As Long
    For i = 0 To salesOrders1.Count - 1
        salesOrders.Add salesOrders1(i)
    Next
    For i = 0 To salesOrders2.Count - 1
        salesOrders.Add salesOrders2(i)
    Next
    Set json1("salesOrders") = salesOrders
    Set MergeJsonArrays = json1
End Function

